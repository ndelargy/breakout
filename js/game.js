/*global $: true, document: true */

(function () {
    "use strict";
    // Getting elements
    var pad = document.getElementById("pad"),
        svg = document.getElementById("svgRoot"),
        message = document.getElementById("message"),

        // Balls
        ball = function () {
            var circle = $(document.createElementNS("http://www.w3.org/2000/svg", "circle")).appendTo(svg),
            oc = circle.attr('class') === undefined ? '' : circle.attr('class'),
            b = {};

            circle[0].setAttribute('r', 10);
            circle.attr('class', oc + ' ball');

            b.ball = circle[0];
            b.radius = 10;
            b.x = 0;
            b.y = 0;
            b.previousBallPosition = {
                x: 0,
                y: 0
            };
            b.directionX = 0;
            b.directionY = 0;
            b.speed = 10;
            return b;
        },

        balls = [ball()],
        // Pad
        padWidth = pad.width.baseVal.value,
        padHeight = pad.height.baseVal.value,
        padX,
        padY,
        padSpeed = 0,
        inertia = 0.80,

        // Bricks
        bricks = [],
        destroyedBricksCount,
        brickWidth = 50,
        brickHeight = 20,
        bricksRows = 5,
        bricksCols = 20,
        bricksMargin = 15,
        bricksTop = 20,

        // Misc.
        minX = balls[0].radius,
        minY = balls[0].radius,
        maxX,
        maxY,
        startDate,

        // Brick function
        Brick = function (x, y, special) {
            var isDead = false,
                position = {
                    x: x,
                    y: y
                },

                rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

            svg.appendChild(rect);

            rect.setAttribute("width", brickWidth);
            rect.setAttribute("height", brickHeight);


            if (special) {
                rect.setAttribute("fill", special.colour);
            } else {
                // Random green color
                var chars = "456789abcdef";
                var color = "";
                for (var i = 0; i < 2; i++) {
                    var rnd = Math.floor(chars.length * Math.random());
                    color += chars.charAt(rnd);
                }
                rect.setAttribute("fill", "#00" + color + "00");
            }




            this.drawAndCollide = function () {
                if (isDead)
                    return;
                // Drawing
                rect.setAttribute("x", position.x);
                rect.setAttribute("y", position.y);
                var self = this;
                // Collision
                _.each(balls, function(ball){
                    if (ball.x + ball.radius < position.x || ball.x - ball.radius > position.x + brickWidth)
                        return;

                    if (ball.y + ball.radius < position.y || ball.y - ball.radius > position.y + brickHeight)
                        return;

                    // Dead
                    self.remove();
                    isDead = true;
                    destroyedBricksCount++;
                    if ( special ){
                        special.callback(ball);
                    }

                    if (! ball.superBall) {
                        // Updating ball
                        ball.x = ball.previousBallPosition.x;
                        ball.y = ball.previousBallPosition.y;

                        ball.directionY *= -1.0;            
                    }


                });
            };

            // Killing a brick
            this.remove = function () {
                if (isDead)
                    return;
                svg.removeChild(rect);
            };
        };

    // Collisions
    function collideWithWindow() {
        _.each(balls, function(ball){
  
            if (ball.x < minX) {
                ball.x = minX;
                ball.directionX *= -1.0;
            }
            else if (ball.x > maxX) {
                ball.x = maxX;
                ball.directionX *= -1.0;
            }

            if (ball.y < minY) {
                ball.y = minY;
                ball.directionY *= -1.0;
            }
            else if (ball.y > maxY) {
                ball.y = maxY;
                ball.directionY *= -1.0;
                lost(ball);
            }
        });
    }

    function collideWithPad() {
        _.each(balls, function(ball){
            if (ball.x + ball.radius < padX || ball.x - ball.radius > padX + padWidth)
                return;

            if (ball.y + ball.radius < padY)
                return;

            ball.x = ball.previousBallPosition.x;
            ball.y = ball.previousBallPosition.y;
            ball.directionY *= -1.0;

            var dist = ball.x - (padX + padWidth / 2);

            ball.directionX = 2.0 * dist / padWidth;

            var square = Math.sqrt(ball.directionX * ball.directionX + ball.directionY * ball.directionY);
            ball.directionX /= square;
            ball.directionY /= square;
        });
    }

    // Pad movement
    function movePad() {
        padX += padSpeed;

        padSpeed *= inertia;

        if (padX < minX)
            padX = minX;

        if (padX + padWidth > maxX)
            padX = maxX - padWidth;
    }

    registerMouseMove(document.getElementById("gameZone"), function (posx, posy, previousX, previousY) {
        padSpeed += (posx - previousX) * 0.2;
    });
    
    KeyboardController({
        37: function() { padSpeed -= 5; },
        38: function() {  },
        39: function() { padSpeed += 5; },
        40: function() {  }
    }, 10);

    function checkWindow() {
        maxX = window.innerWidth - minX;
        maxY = window.innerHeight - 130 - 40 - minY;
        padY = maxY - 30;
    }

    function gameLoop() {
        movePad();

        // Movements
        _.each(balls, function(ball){
            ball.previousBallPosition.x = ball.x;
            ball.previousBallPosition.y = ball.y;
            ball.x += ball.directionX * ball.speed;
            ball.y += ball.directionY * ball.speed;
        });
        // Collisions
        collideWithWindow();
        collideWithPad();
    
        // Bricks
        for (var index = 0; index < bricks.length; index++) {
            bricks[index].drawAndCollide();
        }

        // Balls
        _.each(balls, function(ball){
            ball.ball.setAttribute("cx", ball.x);
            ball.ball.setAttribute("cy", ball.y);
        });
        // Pad
        pad.setAttribute("x", padX);
        pad.setAttribute("y", padY);
    
        // Victory ?
        if (destroyedBricksCount == bricks.length) {
            win();
        }
    }

    function generateBricks() {
        // Removing previous ones
        for (var index = 0; index < bricks.length; index++) {
            bricks[index].remove();
        }

        // Creating new ones
        var brickID = 0;

        var offset = (window.innerWidth - bricksCols * (brickWidth + bricksMargin)) / 2.0;

        for (var x = 0; x < bricksCols; x++) {     
            for (var y = 0; y < bricksRows; y++) {
                var brickSpecial = getSpecial();
                bricks[brickID++] = new Brick(offset + x * (brickWidth + bricksMargin), y * (brickHeight + bricksMargin) + bricksTop, brickSpecial);
            }
        }
    }

    var resetWidthTimeouts = [];
    var redPadDouble = function(){
        var padWidthAdjustInterval, targetWidth;
  
        function adjustPadWidth(newTargetWidth){
            targetWidth = newTargetWidth;
//            padWidthAdjustInterval = setInterval( doAdjust, 10 );
            doAdjust();
            if( resetWidthTimeouts.length > 1 ){
                var resetWidthTimeoutToclear = resetWidthTimeouts.shift();
                window.clearTimeout(resetWidthTimeoutToclear);
            }
        }
  
        function doAdjust(){
            if( padWidth < targetWidth ){
                padWidth += 1;
            }
            else if (padWidth > targetWidth) {
                padWidth -= 1;
            }
            pad.width.baseVal.value = padWidth;
    
//            if ( padWidth == targetWidth){
            if ( padWidth != targetWidth){
//                window.clearInterval(padWidthAdjustInterval);
                padWidthAdjustInterval =  _.delay( doAdjust, 10 );
            }
        }
  
        resetWidthTimeouts.push( _.delay(adjustPadWidth, 7000, 150) );
        adjustPadWidth(300);
  
    };

    var blueExtraBall = function(){
        var b = ball();
        balls.push(b);
        startBall(b);
    };

    var orangeSuperBall = function(ball){
        ball.superBall = true;
  
        var oc = $(ball.ball).attr('class') === undefined ? '' : $(ball.ball).attr('class');
        $(ball.ball).attr('class', oc + ' super');
        _.delay(function(){
            $(ball.ball).attr('class',oc);
            ball.superBall = false;
        },7000);
    }


    var special = [
    {
        colour:'#cc0000',
        callback:redPadDouble
    },

    {
        colour:'#0000cc',
        callback:blueExtraBall
    },

    {
        colour:'#ff6600',
        callback:orangeSuperBall
    }
    ];

    function getSpecial(){
        if ( Math.random() < 0.9 ){
            return false;
        }
        else {
            return special[_.random(0,special.length-1)];
        }
    }

    var gameIntervalID = -1;
    function lost(ball) {
        $(ball.ball).remove();
        ball.dead = true;
        balls = _.filter(balls, function(ball){
            return !ball.dead
        });

        if ( balls.length > 0 ){
            return;
        }
        clearInterval(gameIntervalID);
        gameIntervalID = -1;
    
        message.innerHTML = "cha cha cha !";
        message.style.visibility = "visible";
    }

    function win() {
        clearInterval(gameIntervalID);
        gameIntervalID = -1;

        var end = (new Date).getTime();

        message.innerHTML = "Victory ! (" + Math.round((end - startDate) / 1000) + "s)";
        message.style.visibility = "visible"; 
    }

    function startBall(ball){
      
        ball.x = window.innerWidth / 2.0;
        ball.y = maxY - 33;

        ball.previousBallPosition.x = ball.x;
        ball.previousBallPosition.y = ball.y;

        ball.directionX = Math.random();
        ball.directionY = -1.0;
    }

    function initGame() {
        message.style.visibility = "hidden";

        checkWindow();
    
        padWidth = 150;
    
        pad.width.baseVal.value = padWidth;
        _.each(balls,function(ball){
            $(ball.ball).remove();
        });
        balls = [ball()];
    
        padX = (window.innerWidth - padWidth) / 2.0;
        _.each(balls, function(ball){
            startBall(ball);
        });
    
        padSpeed = 0;

        generateBricks();
        gameLoop();
    }



    function startGame() {
        initGame();

        destroyedBricksCount = 0;

        if (gameIntervalID > -1)
            clearInterval(gameIntervalID);

        startDate = (new Date()).getTime();
        ;
        gameIntervalID = setInterval(gameLoop, 16);
    }

    document.getElementById("newGame").onclick = startGame;
    window.onresize = initGame;

    initGame();
}());
