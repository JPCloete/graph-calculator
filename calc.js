var coordinates = {
    x: 0,
    y: 0,
    z: {
        initialBase: 15, 
        base: 15, //base is a relative unit to determine interval size. Factors of 3 to allow 3 bases(1, 2, 5), value of 15 allows zooming in to a factor of 10e-5 and zooming out to a factor of 10e10
        fraction: 5
    },
    hoverPoint: {
        x: 0,
        y: 0
    }
}

var interval = {
    base: 1,
    tenthExponent: 1,
    exponent: 0,
    pxPerUnit: 0,
    dynamicZLimit: {
        minExponent: -5, //The maxinum amount that can be zoomed in, values become 
        xThreshold: 700000000
    },
    count: {
        initialValue: 10,
        xValue: 0, //derived from initialValue + zFraction * rateOfChange
        yValue: 0, //y's value is derived from x's value, therefore initial y.value is 0
    },
    text: {
        x0pxCoordinate: 0, //this value is 0 when x's 0 value is not in view range
        y0pxCoordinate: 0, //this value is 0 when y's 0 value is not in view range
        fontSize: 0,
        offSet: 0,
        exponents: ["⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰", "¹¹", "¹²", "¹³"]
    }
}


var windowDimensions = {
    isMobile: false,
    width: 0,
    height: 0,
    whCombo: 0
}

var canvas = {
    htmlElement: document.querySelector('#canvas'),
    getCtx: () => {
        var htmlElement = document.querySelector('#canvas');
        return htmlElement.getContext('2d');
    }
}

window.onload = () => { //calculates initial values and draws grid
    if (typeof window.orientation !== 'undefined') { //checks if device is mobile
        windowDimensions.isMobile = true;
    }
    gridSetUp();
    calculateFontsize();
    setIntervalCount();
    renderGrid();
}

function gridSetUp() {
    clearCanvas();
    windowDimensions.width = window.innerWidth;
    windowDimensions.height = window.innerHeight;
    windowDimensions.whCombo = windowDimensions.width + windowDimensions.height;
    setCanvasDimensions();
    setIntervalCount();
    var deltaXUnits = interval.count.xValue * interval.base * interval.tenthExponent; //Net X Units
    interval.pxPerUnit = windowDimensions.width / deltaXUnits; //pxPerUnit value used for coordinate - and pixel location calculations
}

function calculateFontsize() {
    interval.text.fontSize = Math.ceil(windowDimensions.width / 250) + 8;
    interval.text.offSet = 10 / interval.text.fontSize;
}   


window.onmousedown = () => { //fires dragEvent
    if(windowDimensions.isMobile) {
        return;
    }
    dragEvent();
}

function dragEvent(e) { //custom event(hold mouse button 1 and drag)
    window.onmouseup = () => { //clears event after mouse button has been released
        window.onmousemove = null;
    }
    e = e || window.event;
    posX = e.clientX; //browser's x pixels
    posY = e.clientY; //browser's y pixels
    window.onmousemove = (e) => { //drag party of drag event ;)
        posXDifference = e.clientX - posX;
        posYDifference = e.clientY - posY;
        if (Math.abs(posXDifference) + Math.abs(posYDifference) > 1) { //makes rerendering less frequent to improve performance
            var currentCoordinates = calculateCoordinatesFromPx(e.clientX, e.clientY); //get current coordinates
            var prevCoordinates = calculateCoordinatesFromPx(posX, posY); //get previousCoordinates
            if (currentCoordinates != null && prevCoordinates != null) {
                calculateDragNewMdpt(prevCoordinates[1], currentCoordinates[1], prevCoordinates[0], currentCoordinates[0]);
            }
            renderGrid();
            dragEvent(e);
        }
    }
}

window.touchstart = () => {
    if(windowDimensions.isMobile == false) {
        return;
    }
    mobDragEvent();
}

function mobDragEvent(e) {
    window.touchend = () => {
        window.touchmove = null;
    }
    e = e || window.event;
    posX = e.clientX;
    posY = e.clientY;
    window.touchmove = (e) => {
        posXDifference = e.clientX - posX;
        posYDifference = e.clientY - posY;
        if (Math.abs(posXDifference) + Math.abs(posYDifference) > 1) { //makes rerendering less frequent to improve performance
            var currentCoordinates = calculateCoordinatesFromPx(e.clientX, e.clientY); //get current coordinates
            var prevCoordinates = calculateCoordinatesFromPx(posX, posY); //get previousCoordinates
            if (currentCoordinates != null && prevCoordinates != null) {
                calculateDragNewMdpt(prevCoordinates[1], currentCoordinates[1], prevCoordinates[0], currentCoordinates[0]);
            }
            renderGrid();
            mobDragEvent(e);
        }
    }
}

window.addEventListener('orientationchange', () => {
    gridSetUp();
    calculateFontsize();
    renderGrid();
});


window.addEventListener('resize', () => {
    gridSetUp();
    calculateFontsize();
    renderGrid();
});

function renderGrid() {
    gridSetUp();
    const gridInterval = interval.base * interval.tenthExponent;
    const xOffset = roundToInterval(coordinates.x, gridInterval);
    const yOffset = roundToInterval(coordinates.y, gridInterval);
    const unitIntervalCount = windowDimensions.width >= windowDimensions.height ? interval.count.xValue : interval.count.yValue; //interval.count.yValue used for when deltaY > deltaX(browser height > width)
    const subIntervalCount = gridInterval % (2 * interval.tenthExponent) == 0 ? 4 : 5; //calculates how many subIntervals should be between each interval (4 if base is 2; 5 if base is 1 || 5);
    var i = 0;
    var j = 1;
    var coordinateRefArr = [];
    var coordinateRef = calculatePxFromCoordinates(xOffset, yOffset);
    const coordinatePxDifference = coordinateRef[0] - calculatePxFromCoordinates(xOffset - gridInterval, coordinates.y)[0]; //calculates distance in px between each axis
    coordinateRefArr.push(coordinateRef[0]);
    coordinateRefArr.push(coordinateRef[0]);
    coordinateRefArr.push(coordinateRef[1]);
    coordinateRefArr.push(coordinateRef[1]);
    var dupCoordinateRefArr = coordinateRefArr.slice(); //creates duplicate coordinateRefArr instance
    //handles if text renders on the x=0/y=0 axis or on screen sides
    var x0pxCoordinate = calculatePxFromCoordinates(0, coordinates.y);
    var y0pxCoordinate = calculatePxFromCoordinates(coordinates.x, 0);
    interval.text.x0pxCoordinate = x0pxCoordinate[0] != null ? x0pxCoordinate[0] : 0;
    interval.text.y0pxCoordinate = y0pxCoordinate[1] != null ? y0pxCoordinate[1] : 0;
    while (i <= (unitIntervalCount / 2) + 2) { //2 while loops used to keep z-index of intersecting lines consistent
        renderSubAxis(coordinateRefArr[0], subIntervalCount, true, true); //renders positive(relative to mdpt) x subValues
        renderSubAxis(coordinateRefArr[1], subIntervalCount, true, false); //renders negative(relative to mdpt) x subValues
        renderSubAxis(coordinateRefArr[2], subIntervalCount, false, false); //renders positive(relative to mdpt) y subValues
        renderSubAxis(coordinateRefArr[3], subIntervalCount, false, true); //renders negative(relative to mdpt) y subValues
        coordinateRefArr[0] = coordinateRefArr[0] - coordinatePxDifference;
        coordinateRefArr[1] = coordinateRefArr[1] + coordinatePxDifference;
        coordinateRefArr[2] = coordinateRefArr[2] - coordinatePxDifference;
        coordinateRefArr[3] = coordinateRefArr[3] + coordinatePxDifference;
        i++;
    }
    renderAxis(dupCoordinateRefArr[0], dupCoordinateRefArr[0], 0, windowDimensions.height, xOffset, true); //renderered before while loop to avoid double render for first axis
    renderAxis(0, windowDimensions.width, dupCoordinateRefArr[2], dupCoordinateRefArr[2], yOffset, false);
    while (j <= (unitIntervalCount / 2) + 1) {
        dupCoordinateRefArr[0] = dupCoordinateRefArr[0] - coordinatePxDifference;
        dupCoordinateRefArr[1] = dupCoordinateRefArr[1] + coordinatePxDifference;
        dupCoordinateRefArr[2] = dupCoordinateRefArr[2] - coordinatePxDifference;
        dupCoordinateRefArr[3] = dupCoordinateRefArr[3] + coordinatePxDifference;
        renderAxis(dupCoordinateRefArr[0], dupCoordinateRefArr[0], 0, windowDimensions.height, (xOffset - (gridInterval * j)), true); //renders positive(relative to mdpt) x values
        renderAxis(dupCoordinateRefArr[1], dupCoordinateRefArr[1], 0, windowDimensions.height, (xOffset + (gridInterval * j)), true); //renders negative(relative to mdpt) x values
        renderAxis(0, windowDimensions.width, dupCoordinateRefArr[2], dupCoordinateRefArr[2], (yOffset + (gridInterval * j)), false); //renders positive(relative to mdtp) y values 
        renderAxis(0, windowDimensions.width, dupCoordinateRefArr[3], dupCoordinateRefArr[3], (yOffset - (gridInterval * j)), false); //renders negative(relatvie to mdpt) y values
        j++
    }
}

function renderAxis(x1, x2, y1, y2, coordinate, isX) {
    if(interval.exponent <= 1) {
        coordinate = coordinate.round(Math.abs(interval.exponent));
    }
    if (x1 == null || x2 == null || y1 == null || y2 == null) {
        return; //do nothing
    }
    if (coordinate == 0) {
        drawLine(x1, x2, y1, y2, 1, "black");
        return;
    } else {
        drawLine(x1, x2, y1, y2, 1, "#989898");
    }
    if (isX) {  
        if(interval.text.y0pxCoordinate == 0) {
            drawIntervalText(coordinate, x1, interval.text.fontSize, false);
            drawIntervalText(coordinate, x1, windowDimensions.height, false);
            return;
        }
        drawIntervalText(coordinate, x1, interval.text.y0pxCoordinate + 15, false);
        return;
    }
    if(interval.text.x0pxCoordinate == 0) {
        drawIntervalText(coordinate, 0, y1, false);
        drawIntervalText(coordinate, windowDimensions.width, y1, true);
        return;
    }
    drawIntervalText(coordinate, interval.text.x0pxCoordinate, y1, false);
}

function drawIntervalText(intervalBase, x, y, isMaxWidth) {
    var gridInterval = intervalBase;
    const ctx = canvas.getCtx(); //initialize canvas
    ctx.scale(1, 1);
    ctx.font = interval.text.fontSize + "px Verdana";
    if(Math.abs(intervalBase) >= 100000) {
        intervalBase = intervalBase.toExponential();
        let exponent = Math.floor(intervalBase.slice(-2));
        let sliceLocation = -3;
        if(exponent >= 10) sliceLocation --; //increases the amount of string sliced when exponent becomes 2 chars
        intervalBase = intervalBase.replace(intervalBase.slice(sliceLocation), "x10" + interval.text.exponents[exponent - 5]) //converts from exponent string format to scientific notation eg. 12e+3 => 12x10³
        intervalBaseLen = Math.sign(gridInterval) == -1 ? intervalBase.length - 1 : intervalBase.length
        if(intervalBaseLen >= 10) {
            return;
        }
    }
    if(isMaxWidth) {
        ctx.textAlign = "right";
        x = x - interval.text.offSet
        y = y - interval.text.offSet
    } else {
        ctx.textAlign = "start";
        x = x + interval.text.offSet
        y = y - interval.text.offSet
    } 
    ctx.fillStyle = "black"
    ctx.fillText(intervalBase, x, y);
}

function renderSubAxis(coordinate, subIntervalCount, isX, isPositive) {
    const gridInterval = interval.base * interval.tenthExponent;
    var i = 1;
    while (i < subIntervalCount) {
        if (coordinate == null) { //if coordinate isn't in bound, end loop
            return;
        }
        var subCoordinatePos = ((gridInterval * interval.pxPerUnit) / subIntervalCount) * i;
        var subCoordinate = isPositive == true ? coordinate + subCoordinatePos : coordinate - subCoordinatePos;
        x1 = isX == true ? subCoordinate : 0;
        x2 = isX == true ? subCoordinate : windowDimensions.width;
        y1 = isX == false ? subCoordinate : 0;
        y2 = isX == false ? subCoordinate : windowDimensions.height;
        drawLine(x1, x2, y1, y2, 1, "#E0E0E0");
        i++;
    }
}

function calculateCoordinatesFromPx(xPx, yPx) {
    var mdptX = windowDimensions.width / 2;
    var mdptY = windowDimensions.height / 2;
    if (Math.sign(xPx) == -1 || Math.sign(yPx) == -1 || xPx > windowDimensions.width || yPx > windowDimensions.height) { //checks if pixels aren't negative/out of bounds
        return [null, null];
    } else {
        var x = ((xPx - mdptX) / interval.pxPerUnit) + coordinates.x; //moves x's 0 value from top left to center
        var y = (((yPx * -1) + mdptY) / interval.pxPerUnit) + coordinates.y; //moves y's 0 value from top left to center

        return [x, y];
    }
}

function calculatePxFromCoordinates(x, y) {
    var mdptX = windowDimensions.width / 2;
    var mdptY = windowDimensions.height / 2;
    var xPx = ((x - coordinates.x) * interval.pxPerUnit) + mdptX; //moves xPx's 0 value back to top left, pixels can't be negative, must be cast to positive number
    var yPx = (((y - coordinates.y) * interval.pxPerUnit) - mdptY) * -1; //moves yPx's 0 value back to top left
    if (Math.sign(xPx) == -1 || Math.sign(yPx) == -1 || xPx > windowDimensions.width || yPx > windowDimensions.height) {
        return [null, null];
    } else {
        return [xPx, yPx];
    }
}

function calculateDragNewMdpt(y2, y1, x2, x1) {
    var y = y2 - y1;
    var x = x2 - x1;
    coordinates.y = coordinates.y + y;
    coordinates.x = coordinates.x + x;
}

window.addEventListener('wheel', (e) => {
    let posX = e.pageX; //browser's x pixels
    let posY = e.pageY; //browser's y pixels
    let oldHoverCoordinates = calculateCoordinatesFromPx(posX, posY);
    let absX = Math.abs(coordinates.x);
    let absY = Math.abs(coordinates.y);
    if(absX >= interval.dynamicZLimit.xThreshold && absX > absY) { 
        let xThresholdDivided = absX / interval.dynamicZLimit.xThreshold;
        interval.dynamicZLimit.minExponent = Math.floor(Math.log10(xThresholdDivided)) - 3; //used to scale minExponent based on how large coordinate.x is. Prevents inaccuracy with floats when values become to large
    }else if(absY >= interval.dynamicZLimit.xThreshold) {
        let xThresholdDivided = absY / interval.dynamicZLimit.xThreshold;
        interval.dynamicZLimit.minExponent = Math.floor(Math.log10(xThresholdDivided)) - 3; //used to scale minExponent based on how large coordinate.y is. Prevents inaccuracy with floats when values become to large
    }
    if (e.deltaY == 100 && interval.exponent != 11) { //deltaY = 100 if mouseWheelUp; max exponent of 10
        coordinates.z.fraction++;
        initZoomEvent(oldHoverCoordinates, posX, posY);
    } else if (e.deltaY == -100 && interval.exponent != interval.dynamicZLimit.minExponent) { //deltaY = -100 if mouseWheelDown; min exponent of -5
        coordinates.z.fraction--;
        initZoomEvent(oldHoverCoordinates, posX, posY)
    }
    renderGrid();
});

function initZoomEvent(oldHoverCoordinates, posX, posY) {
    handleZFractionLoop();
    gridSetUp(); //need to run this before getting the new hoverCoordinates
    let newHoverCoordinates = calculateCoordinatesFromPx(posX, posY);
    calculateMdptFromHoverpointZoom(oldHoverCoordinates, newHoverCoordinates)
}

function calculateMdptFromHoverpointZoom(oldHoverCoordinates, newHoverCoordinates) {
    let hoverOffsetX = oldHoverCoordinates[0] - newHoverCoordinates[0];
    let hoverOffsetY = oldHoverCoordinates[1] - newHoverCoordinates[1];
    coordinates.x += hoverOffsetX;
    coordinates.y += hoverOffsetY;
}

function handleZFractionLoop() {
    if (coordinates.z.fraction == 10) { //handles zoom out looping
        coordinates.z.base++;
        coordinates.z.fraction = 0;
        calculateIntervalBase();
    } else if (coordinates.z.fraction == -1) { //handles zoom in looping
        coordinates.z.base--;
        coordinates.z.fraction = 9;
        calculateIntervalBase();
    }
}

function setIntervalCount() {
    let intervalBasisCount = windowDimensions.whCombo / 300;
    interval.count.xValue = intervalBasisCount + (intervalBasisCount * (coordinates.z.fraction / 10));
    interval.count.yValue = (windowDimensions.height / windowDimensions.width) * interval.count.xValue;
}

function calculateIntervalBase() {
    var zBaseRemainder = coordinates.z.base % 3;
    switch (zBaseRemainder) {
        case 0:
            interval.base = 1;
            calculateIntervalExponent(zBaseRemainder); //when moving from interval base of 5 -> 1
            return;
        case 1:
            interval.base = 2;
            return;
        case 2:
            interval.base = 5;
            calculateIntervalExponent(zBaseRemainder); //when moving from interval base of 1 -> 5
            return;
        default:
            return; //do nothing
    }
}

function calculateIntervalExponent(remainder) {
    var defaultZDifference = coordinates.z.base - coordinates.z.initialBase - remainder; //remainder is minused to "round" to the 1st factor of 3 below the current base.
    var exponent = defaultZDifference / 3;
    if(exponent <= 1) {
        interval.exponent = exponent.round(Math.abs(interval.exponent));
        interval.tenthExponent = (10 ** exponent).round(Math.abs(interval.exponent));
    } else {
        interval.exponent = exponent;
        interval.tenthExponent = 10 ** exponent
    }   
}

function setCanvasDimensions() {
    canvas.htmlElement.width = windowDimensions.width;
    canvas.htmlElement.height = windowDimensions.height;
}

function drawLine(x1, x2, y1, y2, lineWidth, lineColor) {
    const ctx = canvas.getCtx();
    ctx.beginPath();
    x1 = Math.round(x1) + 0.5;
    x2 = Math.round(x2) + 0.5;
    if (y1 == y2) {
        y1 = Math.round(y1) + 0.5;
        y2 = Math.round(y2) + 0.5;
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
}

function clearCanvas() {
    const ctx = canvas.getCtx();
    ctx.clearRect(0, 0, windowDimensions.width, windowDimensions.height); //easy way to clear canvas.
}

function roundToInterval(num, interval) {
    var remainder = num % interval;
    if (remainder >= interval / 2) {
        num += (interval - remainder);
    } else {
        num -= remainder;
    }
    return num;
}

Number.prototype.round = function(places) {
    return +(Math.round(this + "e+" + places)  + "e-" + places);
}

