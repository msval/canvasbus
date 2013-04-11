var canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var ctx = canvas.getContext('2d');

var stationColors = ['brown', 'orange', 'yellow', 'green'];
var busLength = 150;
var passangerSize = 10;
var spacing = 3;
var busColor = '#0000ff';
var driveSpace = 2 * passangerSize;
var blinkerColor = '#eea300';
var lightBlinkerColor = shadeColor(blinkerColor, 30);
var blinkerWidth = 10;
var blinkerHeight = 4;
var passangerSpeed = 2;
var stationCapacity = 10;
var stationCycle = 40;
var stationLoadingCycle = 500;
var busInStationAfterLoading = 100;
var busdx = 4;
var busdy = 4;
var busdAng = 0.02;

var busWidth = 3 * (spacing * 2 + passangerSize);
var doorSize = (spacing * 2 + passangerSize);
var unloadDistance = busWidth + (spacing * 2 + passangerSize);

var Blinker = function (isOn, period) {
	this.isOn = isOn;
	this.counter = 0;
	this.period = period;
	this.blink = false;
};
Blinker.prototype.check = function () {
	this.counter++;
	if (this.isOn) {
		if (this.counter % this.period === 0) {
			this.blink = !this.blink;
		}
	} else {
		this.blink = false;
	}
};

var Passanger = function (color) {
	if (color) {
		this.color = color;
	} else {
		this.color = randomColor();
	}
	this.x = 0;
	this.y = 0;
	this.destinationSeat = 0;
	this.state = '';
};
Passanger.prototype.draw = function () {
	ctx.beginPath();
	ctx.fillStyle = this.color;
	ctx.arc(this.x, this.y, passangerSize / 2, 0, 2 * Math.PI, true);
	ctx.fill();
};

var Bus = function (x, y, angle) {
	this.x = x;
	this.y = y;
	this.angle = angle;
	this.isDoorOpen = true;
	this.leftBlinker = new Blinker(false, 30);
	this.rightBlinker = new Blinker(false, 30);
	this.passangers = [];
	this.leftLine = (spacing + passangerSize / 2);
	this.rightLine = (busWidth - spacing - passangerSize / 2);
	this.middleLine = busWidth / 2;
	this.startingRow = driveSpace + (2 * spacing + passangerSize) + passangerSize/2;
	this.capacity = Math.floor((busLength - this.startingRow) / (passangerSize + spacing)) * 2;
	this.loadingPassanger = null;
	this.unloadingColor = '';
	this.unloadingPassanger = null;
};
Bus.prototype.free = function () {
	for (var i = 0; i < this.capacity; i++) {
		if (!this.passangers[i]) {
			return i;
		}
	}
	return -1;
};
Bus.prototype.toXY = function (seat) {
	var x = this.rightLine;
	if (seat % 2 === 0) {
		x = this.leftLine;
	}
	var y = this.startingRow + Math.floor(seat / 2) * (passangerSize + spacing);
	return {
		x : x,
		y : y
	};
};
Bus.prototype.loadPassanger = function (passanger) {
	if (passanger) {
		this.loadingPassanger = passanger;
	} else {
		this.loadingPassanger = new Passanger();
	}
	this.loadingPassanger.destinationSeat = this.free();
	this.loadingPassanger.x = busWidth + passangerSize + spacing;
	this.loadingPassanger.y = driveSpace + doorSize / 2;
	this.loadingPassanger.state = 'outside';
};
Bus.prototype.checkLoad = function () {
	if (this.loadingPassanger) {
		var state = this.loadingPassanger.state;
		if (state == 'outside') {
			if (this.loadingPassanger.x + passangerSpeed <= this.middleLine) {
				this.loadingPassanger.x = this.middleLine;
				this.loadingPassanger.state = 'upTheLane';
			} else {
				this.loadingPassanger.x -= passangerSpeed;
			}
		} else if (state == 'upTheLane') {
			if (this.loadingPassanger.y + passangerSpeed >= this.toXY(this.loadingPassanger.destinationSeat).y) {
				this.loadingPassanger.y = this.toXY(this.loadingPassanger.destinationSeat).y;
				this.loadingPassanger.state = 'takeSeat';
			} else {
				this.loadingPassanger.y += passangerSpeed;
			}
		} else if (state == 'takeSeat') {
			var dx = passangerSpeed;
			var destinationSeat = this.toXY(this.loadingPassanger.destinationSeat);
			if (destinationSeat.x == this.leftLine) {
				dx = -dx;
			}
			if (this.loadingPassanger.x + dx <= this.leftLine || this.loadingPassanger.x + dx >= this.rightLine) {
				this.loadingPassanger.x = destinationSeat.x;
				this.passangers[this.loadingPassanger.destinationSeat] = this.loadingPassanger;
				this.loadingPassanger = null;
			} else {
				this.loadingPassanger.x += dx;
			}
		}
	}
};
Bus.prototype.unloadPassangers = function (color) {
	this.unloadingColor = color;
};
Bus.prototype.checkUnload = function (color) {
	if (!this.unloadingPassanger && this.unloadingColor !== '') {
		for (var i = 0; i < this.capacity && !this.unloadingPassanger; i++) {
			if (this.passangers[i] && this.passangers[i].color == this.unloadingColor) {
				this.unloadingPassanger = this.passangers[i];
				if (this.unloadingPassanger.x == this.leftLine) {
					this.unloadingPassanger.state = 'stepToLineL';
				} else {
					this.unloadingPassanger.state = 'stepToLineR';
				}
				this.passangers[i] = null;
			}
		}
		if (!this.unloadingPassanger && this.unloadingColor !== '') {
			this.unloadingColor = '';
		}
	}

	if (this.unloadingPassanger) {
		var state = this.unloadingPassanger.state;

		if (state == 'stepToLineL') {
			if (this.unloadingPassanger.x + passangerSpeed >= this.middleLine) {
				this.unloadingPassanger.x = this.middleLine;
				this.unloadingPassanger.state = 'goToDoor';
			} else {
				this.unloadingPassanger.x += passangerSpeed;
			}
		} else if (state == 'stepToLineR') {
			if (this.unloadingPassanger.x - passangerSpeed <= this.middleLine) {
				this.unloadingPassanger.x = this.middleLine;
				this.unloadingPassanger.state = 'goToDoor';
			} else {
				this.unloadingPassanger.x -= passangerSpeed;
			}
		} else if (state == 'goToDoor') {
			if (this.unloadingPassanger.y - passangerSpeed <= driveSpace + doorSize / 2) {
				this.unloadingPassanger.y = driveSpace + doorSize / 2;
				this.unloadingPassanger.state = 'getOut';
			} else {
				this.unloadingPassanger.y -= passangerSpeed;
			}
		} else if (state == 'getOut') {
			if (this.unloadingPassanger.x >= unloadDistance) {
				this.unloadingPassanger = null;
			} else {
				this.unloadingPassanger.x += passangerSpeed;
			}
		}
	}
};
Bus.prototype.draw = function () {
	ctx.save();

	ctx.translate(this.x, this.y);
	ctx.rotate(this.angle);
	ctx.beginPath();
	ctx.strokeStyle = busColor;
	ctx.fillStyle = busColor;
	ctx.moveTo(0, 0);
	ctx.lineTo(0, busLength);
	ctx.lineTo(busWidth, busLength);
	ctx.lineTo(busWidth, driveSpace + doorSize);
	if (this.isDoorOpen) {
		ctx.moveTo(busWidth, driveSpace);
	} else {
		ctx.lineTo(busWidth, driveSpace);
	}
	ctx.lineTo(busWidth, 0);
	ctx.lineTo(0, 0);
	ctx.stroke();

	ctx.strokeRect(0, 0, busWidth, driveSpace);
	ctx.beginPath();
	ctx.arc(this.leftLine, driveSpace / 2, passangerSize / 2, 0, 2 * Math.PI, true);
	ctx.fill();

	this.leftBlinker.check();
	ctx.fillStyle = this.leftBlinker.blink ? lightBlinkerColor : blinkerColor;
	ctx.fillRect(0, -blinkerHeight, blinkerWidth, blinkerHeight);
	ctx.fillRect(0, busLength, blinkerWidth, blinkerHeight);

	this.rightBlinker.check();
	ctx.fillStyle = this.rightBlinker.blink ? lightBlinkerColor : blinkerColor;
	ctx.fillRect(busWidth - blinkerWidth, -blinkerHeight, blinkerWidth, blinkerHeight);
	ctx.fillRect(busWidth - blinkerWidth, busLength, blinkerWidth, blinkerHeight);

	this.checkLoad();
	if (this.loadingPassanger) {
		this.loadingPassanger.draw();
	}

	this.checkUnload();
	if (this.unloadingPassanger) {
		this.unloadingPassanger.draw();
	}

	for (var i = 0; i < this.capacity; i++) {
		if (this.passangers[i]) {
			var pos = this.toXY(i);
			this.passangers[i].x = pos.x;
			this.passangers[i].y = pos.y;
			this.passangers[i].draw();
		}
	}

	ctx.restore();
};

var Station = function (id, x, y, angle, color) {
	this.id = id;
	this.x = x;
	this.y = y;
	this.angle = angle;
	this.color = color;
	this.newCycleCounter = 0;
	this.passangers = [];
	this.loadingPassanger = null;
	this.loadingCountdown = stationLoadingCycle;
	this.busInStationAfterLoading = busInStationAfterLoading;
};
Station.prototype.orderToY = function (order) {
	return 2 * (passangerSize + spacing) + order * (passangerSize + spacing);
};
Station.prototype.checkNew = function() {
	this.newCycleCounter++;
	if (this.newCycleCounter % stationCycle === 0) {
		if (this.passangers.length < stationCapacity) {
			var newPassanger = new Passanger(randomColor(this.color));
			newPassanger.x = passangerSize;
			newPassanger.y = this.orderToY(stationCapacity);
			newPassanger.state = 'arriving';
			this.passangers[this.passangers.length] = newPassanger;
		}
	}
};
Station.prototype.checkPassangers = function () {
	if (this.loadingPassanger) {
		if (this.loadingPassanger.state == 'goingToLoad') {
			if (this.loadingPassanger.y - passangerSpeed <= (passangerSize / 2 + spacing)) {
				this.loadingPassanger.y = (passangerSize / 2 + spacing);
				this.loadingPassanger.state = '';
			} else {
				this.loadingPassanger.y -= passangerSpeed;
			}
		}
	}

	for (var i = 0; i < this.passangers.length; i++) {
		if (this.passangers[i] && this.passangers[i].state == 'arriving') {
			if (this.passangers[i].y - passangerSpeed <= this.orderToY(i)) {
				this.passangers[i].y = this.orderToY(i);
				this.passangers[i].state = 'waiting';
			} else {
				this.passangers[i].y -= passangerSpeed;
			}
		}
	}
};
Station.prototype.load = function () {
	if (this.passangers.length > 0 && this.passangers[0].state == 'waiting') {
		this.loadingPassanger = this.passangers[0];
		this.loadingPassanger.state = 'goingToLoad';
		this.passangers.splice(0, 1);
		for (var i = 0; i < this.passangers.length; i++) {
			this.passangers[i].state = 'arriving';
		}
	} else {
		this.loadingPassanger = null;
	}
};
Station.prototype.draw = function() {
	ctx.save();
	ctx.translate(this.x, this.y);
	ctx.rotate(this.angle);
	ctx.fillStyle = this.color;
	ctx.fillRect(spacing, 0, 2 * passangerSize, 2 * (passangerSize + spacing) + stationCapacity * (passangerSize + spacing));
	this.checkNew();
	this.checkPassangers();
	if (this.loadingPassanger) {
		this.loadingPassanger.draw();
	}
	for (var i = 0; i < this.passangers.length; i++) {
		this.passangers[i].draw();
	}
	ctx.restore();
};

var SimMaster = function () {
	this.stations = [
		new Station(0, 2 * passangerSize, 0.75 * canvas.height, Math.PI, stationColors[0]),
		new Station(1, canvas.width / 2, canvas.height - 2 * passangerSize, Math.PI / 2, stationColors[1]),
		new Station(2, canvas.width - 2 * passangerSize, 0.25 * canvas.height, 0, stationColors[2]),
		new Station(3, canvas.width / 2, 2 * passangerSize, Math.PI / -2, stationColors[3])
	];
	this.activeStation = this.stations[3];
	var initialBusCoords = this.busToStation(this.activeStation);
	this.bus = new Bus(initialBusCoords.x , initialBusCoords.y, initialBusCoords.angle);
	this.state = 'busInStation';
};
SimMaster.prototype.busToStation = function (station) {
	if (station.angle == Math.PI) {
		return {
			x : station.x + busWidth,
			y : station.y + driveSpace,
			angle : station.angle
		};
	} else if (station.angle == Math.PI / 2) {
		return {
			x : station.x + driveSpace,
			y : station.y - busWidth,
			angle : station.angle
		};
	} else if (station.angle === 0) {
		return {
			x : station.x - busWidth,
			y : station.y - driveSpace,
			angle : station.angle
		};
	} else if (station.angle == Math.PI / -2) {
		return {
			x : station.x - driveSpace,
			y : station.y + busWidth,
			angle : station.angle
		};
	}
	return {};
};
SimMaster.prototype.draw = function () {
	var state = this.state;
	if (state == 'busInStation') {
		if (this.activeStation) {
			if (this.activeStation.loadingCountdown > 0) {
				this.activeStation.loadingCountdown--;
				this.bus.rightBlinker.isOn = true;
				this.bus.leftBlinker.isOn = false;
				if (!this.bus.loadingPassanger) {
					if (this.bus.free() > -1) {
						this.activeStation.load();
						if (this.activeStation.loadingPassanger) {
							this.bus.loadPassanger(this.activeStation.loadingPassanger);
							this.activeStation.loadingPassanger = null;
						}
					} else {
						this.activeStation.loadingCountdown = 0;
					}
				}
			} else {
				this.bus.isDoorOpen = false;
				this.bus.rightBlinker.isOn = false;
				this.bus.leftBlinker.isOn = true;
				this.busInStationAfterLoading = busInStationAfterLoading;
				this.state = 'busLeaving';
			}
		}
	} else if (state == 'busLeaving') {
		if (this.busInStationAfterLoading > 0) {
			this.busInStationAfterLoading--;
		} else {
			if (this.activeStation.id == 3) {
				this.bus.angle = 1.5 * Math.PI;
			}
			this.activeStation = this.stations[(this.activeStation.id + 1) % 4];
			this.bus.leftBlinker.isOn = false;
			this.state = 'busTraveling';
		}
	} else if (state == 'busTraveling') {
		var bts = this.busToStation(this.activeStation);
		var dx = bts.x - this.bus.x;
		var dy = bts.y - this.bus.y;
		var da = bts.angle - this.bus.angle;

		if (Math.abs(dx) >= Math.abs(busdx)) {
			this.bus.x = this.bus.x + (dx > 0 ? 1 : -1) * busdx;
		} else {
			dx = 0;
			this.bus.x = bts.x;
		}
		if (Math.abs(dy) >= Math.abs(busdy)) {
			if (bts.angle % Math.PI === 0) {
				if (Math.abs(dx) < 0.9 * busLength) {
					this.bus.y = this.bus.y + (dy > 0 ? 1 : -1) * busdy;
				}
			} else {
				this.bus.y = this.bus.y + (dy > 0 ? 1 : -1) * busdy;
			}
		} else {
			dy = 0;
			this.bus.y = bts.y;
		}
		if (Math.abs(da) >= Math.abs(busdAng)) {
			if (bts.angle % Math.PI === 0) {
				if (Math.abs(dx) < busLength) {
					var direction = this.bus.x > canvas.width / 2 ? 'right' : 'left';
					if (direction == 'left') {
						if ((this.bus.x + busLength) < canvas.width / 2) {
							this.bus.angle = this.bus.angle + (da > 0 ? 1 : -1) * busdAng;
						}
					} else {
						if ((this.bus.x - busLength) > canvas.width / 2) {
							this.bus.angle = this.bus.angle + (da > 0 ? 1 : -1) * busdAng;
						}
					}
				}
			} else {
				this.bus.angle = this.bus.angle + (da > 0 ? 1 : -1) * busdAng;
			}
		} else {
			da = 0;
		}

		if (dx === 0 && dy === 0 && da === 0) {
			this.bus.rightBlinker.isOn = true;
			this.bus.isDoorOpen = true;
			this.state = 'unloadPassangers';
		}
	} else if (state == 'unloadPassangers') {
		this.bus.unloadPassangers(this.activeStation.color);
		this.state = 'waitForUnload';
	} else if (state == 'waitForUnload') {
		if (this.bus.unloadingColor === '') {
			this.activeStation.loadingCountdown = stationLoadingCycle;
			this.state = 'busInStation';
		}
	}

	for (var i = 0; i < this.stations.length; i++) {
		this.stations[i].draw();
	}
	this.bus.draw();
};

window.requestAnimFrame = (function(){
	return window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function( callback ) {
		window.setTimeout(callback, 1000 / 60);
	};
})();
function shadeColor(color, percent) {
	var num = parseInt(color.slice(1),16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, B = (num >> 8 & 0x00FF) + amt, G = (num & 0x0000FF) + amt;
	return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}
function randomColor(differentThan) {
	if (differentThan) {
		do {
			var color = stationColors[Math.floor(Math.random() * stationColors.length)];
			if (color !== differentThan) {
				return color;
			}
		} while (true);
	}

	return stationColors[Math.floor(Math.random() * stationColors.length)];
}

var gui = new dat.GUI();
gui.add(window, 'passangerSpeed').min(0.1).max(5).step(0.1).name('Passanger Speed');
gui.add(window, 'stationCycle').min(10).max(1000).step(1).name('Arrival Interval');
gui.add(window, 'stationLoadingCycle').min(10).max(1000).step(1).name('Loading Time');

var sim = new SimMaster();

window.onresize = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	sim = new SimMaster();
};

(function animloop(){
	requestAnimFrame(animloop);

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	sim.draw();
})();