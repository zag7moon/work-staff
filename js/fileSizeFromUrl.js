function getFileSize (url) {
  return new Promise(resolve => {
    const http = new XMLHttpRequest();
    http.open('HEAD', url, true); // true = Asynchronous
    http.onreadystatechange = function() {
      if (this.readyState == this.DONE) {
        if (this.status === 200) {
          const fileSize = this.getResponseHeader('content-length');
          resolve(fileSize)
        }
      }
    };
    http.send();
  })
}
