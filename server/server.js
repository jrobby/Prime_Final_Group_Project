var express = require('express');
var index = require('./routes/index');
var api = require('./routes/api');

var app = express();

app.use(express.static('server/public'));

app.use('/api', api);
app.use('/', index);


app.use(express.static('server/public'));

var server = app.listen(process.env.PORT || 3000, function(){
    var port = server.address().port;
    console.log("Listening on port", port);
});
