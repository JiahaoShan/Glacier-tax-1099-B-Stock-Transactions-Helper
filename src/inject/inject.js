chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);

        var css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = "button {display: inline-block;position: relative;width: 120px;height: 32px;line-height: 32px;border-radius: 2px;font-size: 1.5em;background-color: #2196F3;color: #ffffff;transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);transition-delay: 0.2s;}";
        document.body.appendChild(css);
        $("#main").prepend("<div id='helper' style='padding: 10px; border-style: solid;'></div>");
        $("#helper").prepend("<div style='display:none;color:white;font-size:1.2em;padding:10px;background-color:red;' id='errorMessage'></div>");
        $("#helper").prepend("<button style='display:none;' id='process'>Start</button>");
        $("#helper").prepend("<input id='fileInput' type='file' id='input' accept='text/*,.csv'>");
        $("#helper").prepend("<h6>If you get Consolidated Form 1099 PDF from Robinhood, <a href='https://jiahaoshan.github.io/Robinhood-1099-B-Transactions-Export-Tool' target='_blank'>you may export it to CSV.</a></h6>");
        $("#helper").prepend("<h5 id='fileInputInfo'>Please select csv file. For more information, <a target='_blank' href='https://chrome.google.com/webstore/detail/glacier-tax-1099-b-stock/mdnkfhpikjbgedlenpdnkhnfhdaohfcm?hl=en-US&gl=US'>visit here</a>. </br></br> Format Example (keep headers the same and replace green parts with your own transactions): </br></br>name,acquired,sold,proceeds,cost</br><span style='color:#4db6ac'>ALPHABET INC CLASS A COMMON STOCK,10/19/2016,11/03/2016,779.07,824.52</br>TESLA MOTORS INC,12/02/2016,12/06/2016,1468.19,1460.64</span></h5>");
        $("#helper").prepend("<h4>Glacier Tax 1099-B Helper (Chrome Extension)</h4>");

        var fileInput = document.getElementById('fileInput');

        fileInput.addEventListener('change', function(e) {
            if (fileInput.value == "") return;
            var file = fileInput.files[0];
            var textType = /.*\.csv/;

            if (file.name.match(textType)) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    var lines = processData(reader.result);
                    if (!lines) {
                        fileInput.value = "";
                        return;
                    }
                    chrome.storage.local.set({ "transactions": lines, "status" : 'ready', file: fileInput.value}, function(){
                        console.log("ready!");
                        hideErrorMessage();
                        $("#process").show();
                        $("#process").html("Start");
                    });
                }

                reader.readAsText(file);    
            } else {
                $("#process").hide();
                $("#errorMessage").css("background-color","red");
                showErrorMessage("ERROR: only csv with header 'name,acquired,sold,proceeds,cost' is supported!");
            }
        });

        chrome.storage.local.get(["transactions", "status"], function(items){
            var transactions = items.transactions;
            // $("#Name").closest("tr").index()
            if (items.status == 'working') {
                $("#fileInput").hide();
                $("#fileInputInfo").hide();
                $("#process").show().html("Working...").prop("disabled",true);
                var filling = $("#Name").length ? true : false;
                if (filling) {
                    var index = $("#Name").closest("tr").index() - 1;
                    var transaction = transactions[index];
                    $("#Name").val(transaction[0]);
                    $("#PurchasedDateString").val(transaction[1]);
                    $("#SoldDateString").val(transaction[2]);
                    $("#SalesPrice").val(transaction[3]);
                    $("#PurchasePrice").val(transaction[4]);
                    document.forms[0].submit(); return false;
                }
                else {
                    var trs = $("tbody").find("tr");
                    for (var i = 1; i < trs.length - 1; i++) {
                        var tr = trs[i];
                        if (i > transactions.length) {
                            // to many records
                            $(tr).find("td:nth-child(8) a:nth-child(2)")[0].click();
                            return;
                        }
                        var transaction = transactions[i-1];
                        var name = $(tr).find("td:nth-child(1)").text().trim();
                        var acquired = new Date($(tr).find("td:nth-child(2)").text().trim());
                        var sold = new Date($(tr).find("td:nth-child(3)").text().trim());
                        var proceed = parseFloat($(tr).find("td:nth-child(4)").text().trim());
                        var cost = parseFloat($(tr).find("td:nth-child(5)").text().trim());
                        var rname = transaction[0];
                        var racquired = new Date(transaction[1]);
                        var rsold = new Date(transaction[2]);
                        var rproceed = parseFloat(transaction[3]);
                        var rcost = parseFloat(transaction[4]);
                        if(name != rname || 
                            acquired.getTime() != racquired.getTime() ||
                            sold.getTime() != rsold.getTime() ||
                            proceed != rproceed ||
                            cost != rcost
                            ) {
                            $(tr).find("td:nth-child(8) a:nth-child(1)")[0].click();
                            return;
                        }
                    }
                    if (trs.length != (transactions.length + 2)) {
                        $("tbody tr:nth-child(1) td:nth-child(4) a:nth-child(1)")[0].click();
                        return;
                    }
                    else {
                        chrome.storage.local.set({"status" : 'done'}, function(){
                            location.reload(false);
                        });
                    }
                }
            }
            else if (items.status == 'done') {
                $("#errorMessage").css("background-color","green").html("Finished!");
                $("#errorMessage").show();
            }
        });

        $("#process").click(function() {
            chrome.storage.local.get(["status"], function(items){
                if (items.status == 'ready') {
                    chrome.storage.local.set({"status" : 'working'}, function(){
                        location.reload(false);
                    });
                }
            });     
        });
	}
	}, 10);
});


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

function hideErrorMessage()  {
    $("#errorMessage").hide();
}

function showErrorMessage(message) {
    $("#errorMessage").show().html(message);
}

function getErrorMessage(lineNumber, message) {
    return "ERROR: The " + (lineNumber+1) + getOrdinalIndicator(lineNumber+1) + " line has " + message;
}

function validateDate(dateString) {
    return dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ? true : false;
}

function getTotalProceeds() {
    return $("tbody tr:nth-child(1) td:nth-child(3)").text().trim();   
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
    if (inputTotalProceeds.toFixed(2) != parseFloat(getTotalProceeds()).toFixed(2)) {
        showErrorMessage("Total proceeds in the input file doesn't match the total proceeds in the 1099.");
        return false;
    }
    return true;
}
