beforeEach(function () {
  jasmine.addMatchers({
    toHaveLengthLargerThan: function () {
      return {
        compare: function (actual, expected) {
          return {
            pass: actual.length > expected
          };
        }
      };
    }
  });
});
