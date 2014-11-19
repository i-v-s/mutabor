'use strict';
var fs = require('fs');

function patch(fn, str)
{
    var a = true;
    var result = [];
    var lineCount = 0;
    var old = 0;
    var icount = 0;
    var token = '';
    function append(x)
    {
        result.push(str.substr(old, x - old));
        old = x;
    }
    for(var x = 0, e = str.length; x < e; x++)
    {
        var c = str[x];
        if(c >= 'a' && c <= 'z') token += c;
        else if(token)
        {
            switch(token)
            {
            case 'return':
                a = false;
                break;
            }
            token = '';
        }

        switch(c)
        {
        case '=':
        case ':':
        case '(':
            a = false;
            break;
        case ')': 
            a = true;
            break;
        case '\n':
            lineCount++;
            break;
        case '{':
            if(a)
            {
                append(x + 1);
                result.push('__instr(' + lineCount + ');');
                icount++;
            }
            break;
        }
    }
    append(x);
    result.unshift('(function(){var __instr = window.__mutabor && window.__mutabor("' + fn + '") || (function(){});\n');
    result.push('})();');       
    console.log('instrumented:', icount);
    return result.join('');
}


fs.open(process.argv[2], 'r', function(err, fd)
{
    if(err) return console.log(err);
    fs.fstat(fd, function(err, stats)
    {
        if(err) return console.log(err);
        if(!stats.size) return;
        var buffer = new Buffer(stats.size);
        fs.read(fd, buffer, 0, stats.size, 0, function(err, bytesRead, buffer)
        {
            fs.close(fd, function(err){});
            if(err) return console.log(err);
            if(stats.size !== bytesRead) return console.log('count mismatch');
            var str = buffer.toString();
            str = patch(process.argv[2], str);
            buffer = new Buffer(str);
            fs.open('' + process.argv[2], 'w', function(err, fd)
            {
                if(err) return console.log(err);
                fs.write(fd, buffer, 0, buffer.length, 0, function(err)
                {
                    if(err) return console.log(err);    
                    console.log('Completed');
                });
            });
        });
    });
});



