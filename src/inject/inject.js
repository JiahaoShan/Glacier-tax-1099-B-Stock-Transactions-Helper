chrome.extension.sendMessage({}, function(response) {

    var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);

        var css = document.createElement('style');
        css.type = "text/css";
        css.innerHTML = '.myInput {margin-left: 20px;}';
        document.body.appendChild(css);

        var payorIds = getPayorIds();
        var options = `<option value='' selected>Select Payor ID (EIN)</option>\n`;
        for (let id of payorIds) {
            options += `<option value='${id}'>${id}</option>\n`;
        }

        var importerHTML = `
            <div id='helper'>
                <h2>Glacier Tax Prep Form 1099-B Stock Transactions Importer</h2>
                <fieldset>
                    <legend>Instruction</legend>
                    <ol>
                        <li>
                            Add 1099-B forms in the previous page.
                            If you get Consolidated Form 1099 PDF from Robinhood, <a href='https://jiahaoshan.github.io/Robinhood-1099-B-Transactions-Export-Tool' target='_blank'>you may export it to .csv file</a>.
                        </li>
                        <li>Select a desired Payor ID (EIN) in the dropdown list.</li>
                        <li>
                            Choose the corresponding local .csv file. Make sure your .csv file follow the format strictly as below: </br>
                            name,acquired,sold,proceeds,cost</br>
                            ALPHABET INC CLASS A COMMON STOCK,10/19/2016,11/03/2016,779.07,824.52</br>
                            TESLA MOTORS INC,12/02/2016,12/06/2016,1468.19,1460.64
                        </li>
                        <li>If both "Payor ID (EIN)" and the selected .csv file are valid, then the "Import" button will appear. Click "Import" to start importing transactions.</li>
                    </ol>
                    <ul>
                        <li>
                            Disclaimer: This Chrome extension is NOT an official tool from Glacier Tax Prep.
                        </li>
                        <li>
                            Please submit an <a href='https://github.com/jinlibao/Glacier-Tax-Prep-Form-1099-B-Stock-Transactions-Importer/issues/new/choose'>issue</a> on <a href='https://github.com/jinlibao/Glacier-Tax-Prep-Form-1099-B-Stock-Transactions-Importer'>GitHub</a> for bug reports and feature requests.
                            For more information, please visit <a target='_blank' href='https://chrome.google.com/webstore/detail/glacier-tax-1099-b-stock/mdnkfhpikjbgedlenpdnkhnfhdaohfcm?hl=en-US&gl=US'>here</a>.
                        </li>
                    </ul>
                </fieldset>
                <fieldset>
                    <legend>Select Payor ID (EIN) and Choose .csv File</legend>
                    <span class='myInput'>
                        <label for="payorId">Payor ID (EIN): </label>
                        <select name="payorId" id="payorId">
                            ${options}
                        </select>
                    </span>
                    <span class='myInput'><input id='fileInput' type='file' id='input' accept='text/*,.csv'></span>
                    <span class='myInput'><button style='display:none;' id='process'>Start</button></span>
                    <span class='myInput' style='display:none;color:white;font-size:1.2em;background-color:red;' id='errorMessage'></span>
                </fieldset>
            </div>
        `;
        $("#main").prepend(importerHTML);

        var fileInput = document.getElementById('fileInput');
        var payorId = document.getElementById("payorId");

        payorId.addEventListener('focusout', function(e) {
            $("#errorMessage").hide();
            if (!validatePayorId()) {
                resetStatus();
                $("#process").hide();
                $("#errorMessage").css("background-color","orange");
                $("#errorMessage").show().html("WARNING: Invalid Payor ID.");
                return;
            }
            $("#errorMessage").hide();
            if (fileInput.value == "") {
             resetStatus();
             return;
            }
            importFile(fileInput.files[0]);
        })

        fileInput.addEventListener('change', function(e) {
            $("#errorMessage").hide();
            if (fileInput.value == "") {
                resetStatus();
                $("#process").hide();
                $("#errorMessage").css("background-color","orange");
                $("#errorMessage").show().html("WARNING: Invalid Input File.");
                return;
            }
            $("#errorMessage").hide();
            if (!validatePayorId()) {
                resetStatus();
                $("#process").hide();
                $("#errorMessage").css("background-color","orange");
                $("#errorMessage").show().html("WARNING: Invalid Payor ID.");
                return;
            }
            importFile(fileInput.files[0]);
        });

        chrome.storage.local.get(['transactions', 'status', 'payorId', 'index', 'file'], function(items) {
            var transactions = items.transactions;
            var payorId = items.payorId;
            var index = items.index;
            var file = items.file;

            if (items.status == 'working') {
                $("#process").show().html("Importing...").prop("disabled",true);
                var filling = $("#Name").length ? true : false;
                if (filling) {
                    var transaction = transactions[index];
                    chrome.storage.local.set({'index': index + 1}, function() {
                        console.log("Increment index by 1");
                    });
                    if (index + 1 >= transactions.length) {
                        chrome.storage.local.set({'status': 'done'}), function() {
                            location.reload(false);
                        }
                    }
                    $("#Name").val(transaction[0]);
                    $("#PurchasedDateString").val(transaction[1]);
                    $("#SoldDateString").val(transaction[2]);
                    $("#SalesPrice").val(transaction[3]);
                    $("#PurchasePrice").val(transaction[4]);
                    document.forms[0].submit(); return false;
                } else {
                    var trs = $('tbody').find('tr');
                    for (var i = 0; i < trs.length; ++i) {
                        var isTarget = $(trs[i]).find("td")[0].innerText == payorId;
                        if (isTarget && index < transactions.length) {
                            $(trs[i]).find("td:nth-child(4) a:nth-child(1)")[0].click()
                            return;
                        }
                    }
                }
            } else if (items.status == 'done') {
                $("#errorMessage").css("background-color","green").html(`SUCCESS: Imported .csv file for Payor ID ${payorId}.`);
                $("#errorMessage").show();
            }
        });

        $("#process").click(function() {
            chrome.storage.local.get(['status'], function(items) {
                if (items.status == 'ready') {
                    chrome.storage.local.set({'status' : 'working'}, function() {
                        location.reload(false);
                    });
                }
            });
        });
    }
    }, 10);
});

function resetStatus() {
    chrome.storage.local.get(['transactions', 'status', 'payorId', 'index', 'file'], function(items) {
        var transactions = items.transactions;
        var status = items.status;
        var payorId = items.payorId;
        var index = items.index;
        var file = items.file;

        if (status == 'done' && index > 0) {
            status = 'not ready';
            chrome.storage.local.set({ 'transactions': transactions, 'status' : status, 'payorId': payorId, 'index': 0, 'file': file}, function() {
                console.log('Reset status to "not ready".');
            });
        }
    });
}

function importFile(file) {
    var textType = /.*\.csv/;
    if (file.name.match(textType)) {
        var reader = new FileReader();

        reader.onload = function(e) {
            var lines = processData(reader.result);
            if (!lines) {
                fileInput.value = "";
                return;
            }
            chrome.storage.local.set({ 'transactions': lines, 'status' : 'ready', 'payorId': payorId.value, 'index': 0, 'file': file.name}, function() {
                console.log("ready!");
                hideErrorMessage();
                $("#process").show();
                $("#process").html("Import");
            });
        }

        reader.readAsText(file);
    } else {
        $("#process").hide();
        showErrorMessage("ERROR: only csv with header 'name,acquired,sold,proceeds,cost' is supported!");
    }
}

function processData(allText) {
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = allTextLines[0].split(',');
    if (headers.length != 5) {
        showErrorMessage('ERROR: Invalid number of headers');
        return false;
    }
    if (headers[0] != 'name' || headers[1] != 'acquired' || headers[2] != 'sold' || headers[3] != 'proceeds' || headers['4'] != 'cost') {
        showErrorMessage("ERROR: only csv with header 'name,acquired,sold,proceeds,cost' is supported!");
        return false;
    }
    var lines = [];
    for (var i=1; i<allTextLines.length; i++) {
        var data = allTextLines[i].split(',');
        if (data.length == headers.length) {
            var tarr = [];
            for (var j=0; j<headers.length; j++) {
                if (headers[j] == 'acquired') {
                    var acquiredData = data[j].split(' ');
                    if (acquiredData && acquiredData.length > 1) {
                        data[j] = acquiredData[acquiredData.length - 1];
                    }
                }
                tarr.push(data[j]);
            }
            lines.push(tarr);
        }
    }

    return validateInputFile(lines) ? lines : false;
}

function hideErrorMessage() {
    $("#errorMessage").hide();
}

function showErrorMessage(message) {
    $("#errorMessage").css("background-color","red");
    $("#errorMessage").show().html(message);
}

function getErrorMessage(lineNumber, message) {
    return "ERROR: The " + (lineNumber+1) + getOrdinalIndicator(lineNumber+1) + " line has " + message;
}

function validateDate(dateString) {
    return dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ? true : false;
}

function getPayorIds() {
    var payorIds = [];
    var trs = $('tbody').find('tr');
    for (var i = 0; i < trs.length; ++i) {
        if (trs[i].childElementCount == 4) {
            if ($(trs[i]).find("td:nth-child(2)")[0].innerText == "Total Proceeds (Box 2) 1099-B") {
                payorIds.push($(trs[i]).find("td:nth-child(1)")[0].innerText);
            }
        }
    }
    return payorIds;
}

function validatePayorId() {
    return getPayorIds().includes(payorId.value);
}

function getTotalProceeds() {
    if (!validatePayorId()) return -1;
    var trs = $('tbody').find('tr');
    for (var i = 0; i < trs.length; ++i) {
        var isTarget = $(trs[i]).find("td")[0].innerText == payorId.value;
        if (isTarget) {
            return $(trs[i]).find("td:nth-child(3)").text().trim();
        }
    }
}

function getOrdinalIndicator(number) {
    if (number == 1) return 'st';
    if (number == 2) return 'nd';
    if (number == 3) return 'rd';
    return 'th';
}

function validateInputFile(lines) {
    var inputTotalProceeds = 0;
    for (var i = 0; i < lines.length; i++) {
        if (!lines[i][0] || lines[i][0] == "") {
            showErrorMessage(getErrorMessage(i, "empty name"));
            return false;
        }
        if (!lines[i][1] || !validateDate(lines[i][1])) {
            showErrorMessage(getErrorMessage(i, "invalid acquired date"));
            return false;
        }
        if (!lines[i][2] || !validateDate(lines[i][2])) {
            showErrorMessage(getErrorMessage(i, "invalid sold date"));
            return false;
        }
        if (!lines[i][3] || isNaN(lines[i][3]) || parseFloat(lines[i][3]) < 0) {
            showErrorMessage(getErrorMessage(i, "invalid proceeds number"));
            return false;
        }
        if (!lines[i][4] || isNaN(lines[i][4]) || parseFloat(lines[i][4]) < 0) {
            showErrorMessage(getErrorMessage(i, "invalid cost number"));
            return false;
        }
        var acquiredDate = new Date(lines[i][1]);
        var soldDate = new Date(lines[i][2]);
        if (acquiredDate.getTime() > soldDate.getTime()) {
            showErrorMessage(getErrorMessage(i, "invalid acquired date or sold date"));
            return false;
        }
        inputTotalProceeds += parseFloat(lines[i][3]);
    }
    var inputTotal = inputTotalProceeds.toFixed(2);
    var totalProceeds = parseFloat(getTotalProceeds()).toFixed(2);
    if (totalProceeds == -1.00) {
        return false;
    } else if (inputTotal != totalProceeds) {
        alert("Total proceeds in the input file (" + inputTotal + ") doesn't match the total proceeds in the 1099 (" + totalProceeds + "). You may proceed, but it may cause errors.");
        return true;
    }
    return true;
}
