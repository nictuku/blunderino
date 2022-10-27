/*

A library that extends any chessboard library to allow users to draw arrows and circles.
Right-click to draw arrows and circles, left-click to clear the drawings.

Author: Brendon McBain
Date: 07/04/2020

*/

class ChessboardArrows {

	constructor(id, RES_FACTOR = 2, COLOUR = 'rgb(50, 104, 168)') {
			
	this.NUM_SQUARES = 8;
	//var this.resFactor, this.colour, this.drawCanvas, this.drawContext, this.primaryCanvas, this.primaryContext, this.initialPoint, this.mouseDown;

	this.resFactor = RES_FACTOR;
	this.colour = COLOUR; 

	// drawing canvas
	this.drawCanvas = document.getElementById('drawing_canvas');
	this.drawContext = this.changeResolution(this.drawCanvas, this.resFactor);
	this.setContextStyle(this.drawContext);

	// primary canvas
	this.primaryCanvas = document.getElementById('primary_canvas');
	this.primaryContext = this.changeResolution(this.primaryCanvas, this.resFactor);
	this.setContextStyle(this.primaryContext);

	// setup mouse event callbacks
	var board = document.getElementById(id);
	var boardArrows = this;
	board.addEventListener("mousedown", function(event) { boardArrows.onMouseDown(event); });
	board.addEventListener("mouseup", function(event) { boardArrows.onMouseUp(event); });
	board.addEventListener("mousemove", function(event) { boardArrows.onMouseMove(event); });
	board.addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);

	// initialise vars
	this.initialPoint = { x: null, y: null };
	this.finalPoint = { x: null, y: null };
	this.arrowWidth = 15;
	this.mouseDown = false;

	}
	// source: https://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag
	drawArrow(context, fromx, fromy, tox, toy, r) {
		var x_center = tox;
		var y_center = toy;
		var angle, x, y;
		
		context.beginPath();
		
		angle = Math.atan2(toy-fromy,tox-fromx)
		x = r*Math.cos(angle) + x_center;
		y = r*Math.sin(angle) + y_center;

		context.moveTo(x, y);
		
		angle += (1/3)*(2*Math.PI)
		x = r*Math.cos(angle) + x_center;
		y = r*Math.sin(angle) + y_center;
		
		context.lineTo(x, y);
		
		angle += (1/3)*(2*Math.PI)
		x = r*Math.cos(angle) + x_center;
		y = r*Math.sin(angle) + y_center;
		
		context.lineTo(x, y);
		context.closePath();
		context.fill();
	}

	getMousePos(canvas, evt) {
	    var rect = canvas.getBoundingClientRect();
	    return {
	      x: this.Q(evt.clientX - rect.left),
	      y: this.Q(evt.clientY - rect.top)
	    };
	}

	setContextStyle(context) {
	    context.strokeStyle = context.fillStyle = this.colour;
	    context.lineJoin = 'butt';
	}

	onMouseDown(event) {
	    if (event.which == 3) { // right click
		this.mouseDown = true;
		this.initialPoint = this.finalPoint = this.getMousePos(this.drawCanvas, event);
		this.drawCircle(this.drawContext, this.initialPoint.x, this.initialPoint.y, this.primaryCanvas.width/(this.resFactor*this.NUM_SQUARES*2) - 1);
	    }
	}

	onMouseUp(event) {
	    if (event.which == 3) { // right click
		this.mouseDown = false;
		// if starting position == ending position, draw a circle to primary canvas
		if (this.initialPoint.x == this.finalPoint.x && this.initialPoint.y == this.finalPoint.y) {
		    this.drawCircle(this.primaryContext, this.initialPoint.x, this.initialPoint.y, this.primaryCanvas.width/(this.resFactor*this.NUM_SQUARES*2) - 1); // reduce radius of square by 1px
		}
		// otherwise draw an arrow 
		else {
		    this.drawArrowToCanvas(this.primaryContext);
		}
		this.drawContext.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
	    }
	    else if (event.which == 1) { // left click
		// clear canvases
		this.drawContext.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
		this.primaryContext.clearRect(0, 0, this.primaryCanvas.width, this.primaryCanvas.height);
	    }
	}

	onMouseMove(event) {
	    this.finalPoint = this.getMousePos(this.drawCanvas, event);

	    if (!this.mouseDown) return;
	    if (this.initialPoint.x == this.finalPoint.x && this.initialPoint.y == this.finalPoint.y) return;

	    this.drawContext.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
	    this.drawArrowToCanvas(this.drawContext);
	}

	drawArrowToCanvas(context) {
	    // offset finalPoint so the arrow head hits the center of the square
	    var xFactor, yFactor, offsetSize;
	    if (this.finalPoint.x == this.initialPoint.x) {
		yFactor = Math.sign(this.finalPoint.y - this.initialPoint.y)*this.arrowWidth;
		xFactor = 0
	    }
	    else if (this.finalPoint.y == this.initialPoint.y) {
		xFactor = Math.sign(this.finalPoint.x - this.initialPoint.x)*this.arrowWidth;
		yFactor = 0;
	    }
	    else {
		// find delta x and delta y to achieve hypotenuse of this.arrowWidth
		let slope_mag = Math.abs((this.finalPoint.y - this.initialPoint.y)/(this.finalPoint.x - this.initialPoint.x));
		xFactor = Math.sign(this.finalPoint.x - this.initialPoint.x)*this.arrowWidth/Math.sqrt(1 + Math.pow(slope_mag, 2));
		yFactor = Math.sign(this.finalPoint.y - this.initialPoint.y)*Math.abs(xFactor)*slope_mag;
	    }

	    // draw line
	    context.beginPath();
	    context.lineCap = "round";
	    context.lineWidth = 8;
	    context.moveTo(this.initialPoint.x, this.initialPoint.y);
	    context.lineTo(this.finalPoint.x - xFactor, this.finalPoint.y - yFactor);
	    context.stroke();

	    // draw arrow head
	    this.drawArrow(context, this.initialPoint.x, this.initialPoint.y, this.finalPoint.x - xFactor, this.finalPoint.y - yFactor, this.arrowWidth);
	}

	Q(x, d) {  // mid-tread quantiser
	    d = this.primaryCanvas.width/(this.resFactor*this.NUM_SQUARES);
	    return d*(Math.floor(x/d) + 0.5);
	}

	drawCircle(context, x, y, r) {
	    context.beginPath();
	    context.lineWidth = 3;
	    context.arc(x, y, r, 0, 2 * Math.PI);
	    context.stroke();
	}

	// source: https://stackoverflow.com/questions/14488849/higher-dpi-graphics-with-html5-canvas
	changeResolution(canvas, scaleFactor) {
	    // Set up CSS size.
	    canvas.style.width = canvas.style.width || canvas.width + 'px';
	    canvas.style.height = canvas.style.height || canvas.height + 'px';

	    // Resize canvas and scale future draws.
	    canvas.width = Math.ceil(canvas.width * scaleFactor);
	    canvas.height = Math.ceil(canvas.height * scaleFactor);
	    var ctx = canvas.getContext('2d');
	    ctx.scale(scaleFactor, scaleFactor);
	    return ctx;
	}
}
