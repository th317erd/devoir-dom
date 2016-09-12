var path = require('path'),
    Jasmine = require('jasmine');

function isFileArg(arg) {
  return arg.indexOf('--') !== 0 && !isEnvironmentVariable(arg);
}

function parseOptions(argv) {
  var files = [],
      color = process.stdout.isTTY || false,
      filter,
      stopOnFailure,
      random = false,
      seed,
      debug = false;

  argv.forEach(function(arg) {
    if (arg === '--no-color') {
      color = false;
    } else if (arg.match("^--filter=")) {
      filter = arg.match("^--filter=(.*)")[1];
    } else if (arg.match("^--stop-on-failure=")) {
      stopOnFailure = arg.match("^--stop-on-failure=(.*)")[1] === 'true';
    } else if (arg.match("^--random=")) {
      random = arg.match("^--random=(.*)")[1] === 'true';
    } else if (arg.match("^--seed=")) {
      seed = arg.match("^--seed=(.*)")[1];
    } else if (arg.match("^--do-debug")) {
      debug = true;
    } else if (isFileArg(arg)) {
      files.push(arg);
    }
  });

  return {
    color: color,
    filter: filter,
    stopOnFailure: stopOnFailure,
    files: files,
    random: random,
    seed: seed,
    debug: debug
  };
}

function runJasmine(jasmine, env) {
  jasmine.loadConfigFile(process.env.JASMINE_CONFIG_PATH);
  
  if (env.stopOnFailure !== undefined)
    jasmine.stopSpecOnExpectationFailure(env.stopOnFailure);

  if (env.seed !== undefined)
    jasmine.seed(env.seed);

  jasmine.env.debug = env.debug;
  jasmine.randomizeTests(env.random);
  jasmine.showColors(env.color);
  jasmine.execute(env.files, env.filter);
}

var jasmine = new Jasmine({ projectBaseDir: path.resolve() });

jasmine.onComplete(function(passed) {
  if(passed) {
    console.log('All specs have passed');
  } else {
    console.log('At least one spec has failed');
  }
});

runJasmine(jasmine, parseOptions(process.argv.slice(2)));