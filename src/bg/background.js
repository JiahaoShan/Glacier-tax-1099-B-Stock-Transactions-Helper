// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(message => {
    console.log("background: onMessage", message);
    return Promise.resolve("Dummy response to keep the console quiet");
  }
);
