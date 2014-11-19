window.__mutabor = (function()
{
    'use strict';
    var mutabor = {};
    //canvas.style
    //document.body.appendChild(canvas);
    var canvas, ctx;
    var div;
    var height = 200, width = 200;
    var scale = 1.0, offsetX = 0.0, offsetY = 0.0;

    function get(url, done) 
    {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onreadystatechange = function() 
        {
            if(xhr.readyState == 4) 
                done(xhr.status !== 200, xhr.responseText)
        };
        xhr.send();
    }
    function split(src)
    {
        src = src.split('\n');
        src.shift();
        var lc = src.length;
        src = src.join('\n');
        var w = 20;
        var cols = Math.round(Math.sqrt(lc / w));
        var max = lc / cols * 0.7;
        var kav;
        var level = 0;
        lc = 0;
        var newcol = false;
        var result = [], old = 0;
        function append(x)
        {
            result.push(src.substr(old, x - old));
            old = x;
        }
        for(var x = 0, e = src.length; x < e; x++)
        {
            var c = src[x];
            if(kav)
            {
                if(kav !== c) continue;
                if(src[x - 1] === '\\') continue;
                kav = null;
                continue;
            }
            switch(c)
            {
            case '"':
            case '\'': kav = c; continue;
            case '\n': 
                lc++;
                if(newcol)
                {
                    append(x); old++;
                    newcol = false;
                    lc = 0;
                }
                break;
            case '{': level++; break;
            case '}': level--; 
                if(lc > max && level < 6) 
                    newcol = true;
                break;
            }

        }
        append(x);
        for(var x in result)
        {
            result[x] = result[x].split('\n');
        }
        return result;
    }

    function loadSrc(fn)
    {
        function load(where)
        {
            for(var x in where.children)
            {
                var c = where.children[x];
                if(c.tagName !== 'SCRIPT' || !c.src) continue;
                var s = c.src.split('/');
                if(fn !== s[s.length - 1]) continue;
                get(c.src, function(err, src)
                {
                    if(err) {mutabor[fn].src = null; return;}
                    mutabor[fn].src = split(src);
                });
                return true;
            }
            return false;
        }
        load(document.head) || load(document.body);
    }
    var waves = [];
    var showPause = false, showPlay = false, play = true;
    function onMutabor(fn)
    {
        var data = {rates: []};
        mutabor[fn] = data;
        loadSrc(fn);
        return function(pos)
        {
            if(!play) return;
            var d = data.rates[pos];
            if(!d) {data.rates[pos] = d = {rate: 1.0, time: Date.now()}; return;}
            d.rate += 1.0;
            d.time = Date.now();
            waves.push({r:d, t:d.time});
        }
    }   
    var time;
    var max = 1.0;
    var lasttime;
    function paint()
    {
        //ctx.strokeRect(1, 1, width - 1, height - 1);
        var count = 0;
        //ctx.strokeRect(w + 1, w + 1, width - 2 * w - 1, height - 2 * w - 1);
        canvas.width = width;
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        ctx.font = '10px monospace';

        for(var x in mutabor)
        {
            var m = mutabor[x];
            if(typeof m.src === 'undefined') loadSrc(x);
            if(m.src === null) continue;
            var src = m.src;
            var rates = m.rates;
            var lc = 0;
            max *= 0.99;
            var time = Date.now();
            if(play) lasttime = time;
            else time = lasttime;
            for(var y in rates) if(rates[y].rate > max) max = rates[y].rate;
            for(var y in src)
            {
                for(var z in src[y])
                {
                    var sr = src[y][z], rate = rates[lc];
                    if(rate)
                    {
                        var r = (rate.rate / max) * 255;
                        if(play) rate.rate *= 0.97;
                        var t = (5000 + rate.time - time) * (255 / 5000);
                        if(t < 0) t = 0;

                        ctx.strokeStyle = 'rgb('+ [Math.round(r), Math.round(t), Math.round(180 - r * 0.3)].join(',') + ')';
                        rate.x = y * 600;
                        rate.y = z * 20;
                    }
                    ctx.strokeText((lc + 1).toString() + ':' + sr, y * 600, z * 20);
                    lc++;
                }
            }
            while(waves.length && time - waves[0].t > 2000) waves.shift();
            ctx.strokeStyle = '#888';
            for(var x in waves)
            {
                var w = waves[x], r = w.r, t = (time - w.t) / 3;
                ctx.strokeRect(r.x - t, r.y - t, 2 * t + 600, 2 * t);
            }

        }
        if(showPause)
        {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.setTransform(1, 0, 0, 1, 0, height - 60);
            ctx.fillRect(width - 60, 0, 15, 40);
            ctx.fillRect(width - 35, 0, 15, 40);
        }
        if(showPlay)
        {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.moveTo(width - 60, height - 60);
            ctx.lineTo(width - 60, height - 20);
            ctx.lineTo(width - 20, height - 40);
            ctx.fill();
        }
        setTimeout(paint, 100);
    }
    function setW(w)
    {
        width = w;
        canvas.width = w;
    }
    function setH(h)
    {
        height = h;
        canvas.height = h;
    }
    function createCanvas()
    {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
        canvas.style.backgroundColor = 'rgba(255, 255, 255, 1.0)';
        //canvas.style.position = 'absolute';
        //canvas.style.zIndex = '1000';
        canvas.width = width;
        canvas.height = height;
        var mx, my, md = false;
        canvas.onmouseenter = function()
        {
            if(play) showPause = true;
            else showPlay = true;
        }
        canvas.onmouseleave = function() {showPlay = showPause = false;}
        canvas.onmousedown = function(evt)
        {
            if(width - evt.offsetX < 50 && height - evt.offsetY < 50)
            {
                play = !play;
                showPause = play;
                showPlay = !play;
                return;
            }
            md = true;
            //x:(px - left - view.offsetX) / view.scale, y:(py - top - view.offsetY) / view.scale};
            mx = evt.offsetX - offsetX;
            my = evt.offsetY - offsetY;
        }       
        canvas.onmousemove = function(evt)
        {
            if(!md) return;
            offsetX = evt.offsetX - mx;
            offsetY = evt.offsetY - my;
        }
        canvas.onmouseup = function()
        {
            md = false;
        }
        function onMouseWheel(evt)
        {
            var x = (evt.offsetX - offsetX) / scale, y = (evt.offsetY - offsetY) / scale;
            evt.preventDefault();
            var delta = evt.wheelDelta || -evt.detail;

            if(!delta) return;
            var OScale = scale;
            var m = 1.2;
            if(delta < 0) m = 1.0 / m;      
            scale *= m;
            OScale -= scale;
            offsetX += x * OScale;
            offsetY += y * OScale;
            return true;
        }
        canvas.addEventListener("mousewheel", onMouseWheel, false);
        return canvas;
    }
    window.onload = function()
    {
        var posX = 100;
        var posY = 100;
        div = document.createElement('div');
        div.style.position = 'fixed'
        div.style.zIndex = '1000';
        var padd = 10;
        div.style.padding = '' + padd + 'px';
        div.style.paddingTop = '0';
        div.style.border = '1 solid rgb(152, 155, 54)';
        div.style.backgroundColor = 'rgba(174, 249, 105, 0.5)';
        div.style.left = posX.toString() + 'px';
        div.style.top = posY.toString() + 'px';

        var header = document.createElement('div');
        var mx, my, md = false;
        header.onmousedown = function(evt)
        {
            md = true;
            mx = evt.pageX;
            my = evt.pageY;
        }
        var omm = null, omu;
        function takeMouse(mm, mu)
        {
            omm = document.body.onmousemove;
            omu = document.body.onmouseup;
            document.body.onmouseup = mm;
        }
        header.onmousemove = function(evt)
        {
            if(!md) return;
            posX += evt.pageX - mx;
            mx = evt.pageX;
            div.style.left = posX.toString() + 'px';
            posY += evt.pageY - my;
            my = evt.pageY;
            div.style.top = posY.toString() + 'px';
            //my = evt.pageY;
        }
        var rm = false, lm = false, bm = false;
        function up()
        {
            md = false; lm = false; rm = false, bm = false; 
            if(omm !== null) {document.body.onmousemove = omm; omm = null;}
        };
        div.onmousedown = function(evt)
        {
            mx = evt.pageX;
            my = evt.pageY;
            if(evt.offsetX < padd) lm = true;
            if(evt.offsetX > width + padd) rm = true;
            if(evt.offsetY > height + padd) bm = true;
            if(lm || rm || bm) takeMouse(div.onmousemove, up);
        }
        div.onmousemove = function(evt)
        {
            if(rm) setW(width + evt.pageX - mx);
            if(bm) setH(height + evt.pageY - my);
            if(lm)
            {
                posX += evt.pageX - mx;
                setW(width + mx - evt.pageX);
                div.style.left = posX;
            }
            mx = evt.pageX;
            my = evt.pageY;         
        }


        header.onmouseleave = up;
        header.onmouseup = up;
        //div.onmouseleave = up;
        div.onmouseup = up;

        header.textContent = 'МУТАБОР';
        header.style.textAlign = 'center';

        div.appendChild(header);
        div.appendChild(createCanvas());
        document.body.appendChild(div);
        setTimeout(paint, 200);
    }

    return onMutabor;
})()
