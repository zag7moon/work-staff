if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
console.log('До начала тренинга остается «{0} сек.». Нажмите «Продолжить», если вы готовы начинать.'.format(1234))
