describe("vdom", function() {
  var fs = require('fs'),
      D = require('devoir'),
      dom = require('devoir-dom')(D),
      html = fs.readFileSync('spec/support/test.html', 'utf8');

  it("should be able to parse HTML", function() {
    var Document = dom.Document.parse(html);
  });
});
