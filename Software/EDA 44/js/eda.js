// eda.js

(function(ext) {
    var device = null;
    var _rxBuf = [];
	var esdigital = 0;
	var inconv = 0;
	var ejeconv = 0;
	

    // Sensor states:
    var ports = {
        Port1: 1,
        Port2: 2,
        Port3: 3,
        Port4: 4,
        Port5: 5,
        Port6: 6,
        Port7: 7,
        Port8: 8,
		M1:9,
		M2:10
    };
	var slots = {
		Slot1:1,
		Slot2:2
	};
	var switchStatus = {
		On:1,
		Off:0
	};
	var levels = {
		HIGH:1,
		LOW:0
	};
	var EDAout = {
		S1:10,
		S2:11,
		S3:12,
		S4:13
	};
	var EDAin = {
		E1:0,
		E2:1,
		E3:2,
		E4:3
	};
	var JOYeje = {
		X:0,
		Y:1
	};
	var axis = {
		'X-Axis':1,
		'Y-Axis':2,
		'Z-Axis':3
	};
	var tones ={"Si0 (31 Hz)":31,"Do1 (33 Hz)":33,"Re1 (37 Hz)":37,"Mi1 (41 Hz)":41,"Fa1 (44 Hz)":44,"Sol1 (49 Hz)":49,"La1 (55 Hz)":55,"Si1 (62 Hz)":62,
			"Do2 (65 Hz)":65,"Re2 (73 Hz)":73,"Mi2 (82 Hz)":82,"Fa2 (87 Hz)":87,"Sol2 (98 Hz)":98,"La2 (110 Hz)":110,"Si2 (123 Hz)":123,
			"Do3 (131 Hz)":131,"Re3 (147 Hz)":147,"Mi3 (165 Hz)":165,"Fa3 (175 Hz)":175,"Sol3 (196 Hz)":196,"La3 (220 Hz)":220,"Si3 (247 Hz)":247,
			"Do4 (262 Hz)":262,"Re4 (294 Hz)":294,"Mi4 (330 Hz)":330,"Fa4 (349 Hz)":349,"Sol4 (392 Hz)":392,"La4 (440 Hz)":440,"Si4 (494 Hz)":494,
			"Do5 (523 Hz)":523,"Re5 (587 Hz)":587,"Mi5 (659 Hz)":659,"Fa5 (698 Hz)":698,"Sol5 (784 Hz)":784,"La5 (880 Hz)":880,"Si5 (988 Hz)":988,
			"Do6 (1047 Hz)":1047,"Re6 (1175 Hz)":1175,"Mi6 (1319 Hz)":1319,"Fa6 (1397 Hz)":1397,"Sol6 (1568 Hz)":1568,"La6 (1760 Hz)":1760,"Si6 (1976 Hz)":1976,
			"Do7 (2093 Hz)":2093,"Re7 (2349 Hz)":2349,"Mi7 (2637 Hz)":2637,"Fa7 (2794 Hz)":2794,"Sol7 (3136 Hz)":3136,"La7 (3520 Hz)":3520,"Si7 (3951 Hz)":3951,
		"Do8 (4186 Hz)":4186,"Re8 (4699 Hz)":4699
	};

	var values = {};
	var indexs = [];
	
	var versionIndex = 0xFA;
    ext.resetAll = function(){
		device.send([0xff, 0x55, 2, 0, 4]);
    };
	
	ext.runArduino = function(){
		responseValue();
	};
	ext.runDigital = function(pin,level) {
        runPackage(30,EDAout[pin],typeof level=="string"?levels[level]:new Number(level));
    };
    ext.runPwm = function(pin,pwm) {
        runPackage(32,EDAout[pin],pwm);
    };
	ext.runServoArduino = function(pin, angle){
		runPackage(33,EDAout[pin],angle);
	};
	ext.runServoCont = function(pin, angle){
		runPackage(33,EDAout[pin],(angle*0.9)+90);
	};
//	ext.getDigital = function(nextID,pin){
//		var deviceId = 30;
//		getPackage(nextID,deviceId,EDAin[pin]);
//	};
	ext.getDigital = function(nextID,pin) { //getdigital para EDA44
		var deviceId = 31;
		esdigital=1;
		getPackage(nextID,deviceId,EDAin[pin]);
	};

	ext.getAnalog = function(nextID,pin) {
		var deviceId = 31;
		esdigital=0;
		getPackage(nextID,deviceId,EDAin[pin]);
    };
	ext.getUltrasonicArduino = function(nextID,pin){
		var deviceId = 36;
		getPackage(nextID,deviceId,EDAout[pin]-10,EDAout[pin]);
	};
	ext.getAnalogJoystick = function(nextID,pin,eje) {
		var X=[0,1,2,3];
		var Y=[4,5,4,5];
		ejeconv = JOYeje[eje];
		inconv = EDAin[pin];
		if (ejeconv==0){
			inconv = X[inconv];
		}
		if (ejeconv==1){
			inconv = Y[inconv];
		}
		var deviceId = 31;
		esdigital=0;
		getPackage(nextID,deviceId,inconv);
	};
	ext.getBotonJOY = function(nextID,pin) {
		var deviceId = 30;
		if(EDAin[pin]==1){
			getPackage(nextID,deviceId,9);
		}
		if(EDAin[pin]==2){
			getPackage(nextID,deviceId,4);
		}
	};
	
	ext.getTimer = function(nextID){
		if(startTimer==0){
			startTimer = new Date().getTime();
		}
		responseValue(nextID,new Date().getTime()-startTimer);
	};
	ext.runTone = function(pin,tone,beat){
		runPackage(34,EDAout[pin],short2array(typeof tone=="number"?tone:tones[tone]),short2array(typeof beat=="number"?beat:beat));
	};
	function sendPackage(argList, type){
		var bytes = [0xff, 0x55, 0, 0, type];
		for(var i=0;i<argList.length;++i){
			var val = argList[i];
			if(val.constructor == "[class Array]"){
				bytes = bytes.concat(val);
			}else{
				bytes.push(val);
			}
		}
		bytes[2] = bytes.length - 3;
		device.send(bytes);
	}
	
	function runPackage(){
		sendPackage(arguments, 2);
	}
	function getPackage(){
		var nextID = arguments[0];
		Array.prototype.shift.call(arguments);
		sendPackage(arguments, 1);
	}

    var inputArray = [];
	var _isParseStart = false;
	var _isParseStartIndex = 0;
    function processData(bytes) {
		var len = bytes.length;
		if(_rxBuf.length>30){
			_rxBuf = [];
		}
		for(var index=0;index<bytes.length;index++){
			var c = bytes[index];
			_rxBuf.push(c);
			if(_rxBuf.length>=2){
				if(_rxBuf[_rxBuf.length-1]==0x55 && _rxBuf[_rxBuf.length-2]==0xff){
					_isParseStart = true;
					_isParseStartIndex = _rxBuf.length-2;
				}
				if(_rxBuf[_rxBuf.length-1]==0xa && _rxBuf[_rxBuf.length-2]==0xd&&_isParseStart){
					_isParseStart = false;
					
					var position = _isParseStartIndex+2;
					var extId = _rxBuf[position];
					position++;
					var type = _rxBuf[position];
					position++;
					//1 byte 2 float 3 short 4 len+string 5 double
					var value;
					switch(type){
						case 1:{
							value = _rxBuf[position];
							position++;
						}
							break;
						case 2:{
							value = readFloat(_rxBuf,position);
							position+=4;
							if(value<-255||value>1023){
								value = 0;
							}
						}
							break;
						case 3:{
							value = readInt(_rxBuf,position,2);
							position+=2;
						}
							break;
						case 4:{
							var l = _rxBuf[position];
							position++;
							value = readString(_rxBuf,position,l);
						}
							break;
						case 5:{
							value = readDouble(_rxBuf,position);
							position+=4;
						}
							break;
						case 6:
							value = readInt(_rxBuf,position,4);
							position+=4;
							break;
					}
					if(type<=6){
						if (esdigital==0){
							responseValue(extId,value);
						}else{
							if (value < 800){
								responseValue(extId,0);
							}else{
								responseValue(extId,1);
							}
							esdigital=0;
						}
					}else{
						responseValue();
					}
					_rxBuf = [];
				}
			} 
		}
    }
	function readFloat(arr,position){
		var f= [arr[position],arr[position+1],arr[position+2],arr[position+3]];
		return parseFloat(f);
	}
	function readInt(arr,position,count){
		var result = 0;
		for(var i=0; i<count; ++i){
			result |= arr[position+i] << (i << 3);
		}
		return result;
	}
	function readDouble(arr,position){
		return readFloat(arr,position);
	}
	function readString(arr,position,len){
		var value = "";
		for(var ii=0;ii<len;ii++){
			value += String.fromCharCode(_rxBuf[ii+position]);
		}
		return value;
	}
    function appendBuffer( buffer1, buffer2 ) {
        return buffer1.concat( buffer2 );
    }

    // Extension API interactions
    var potentialDevices = [];
    ext._deviceConnected = function(dev) {
        potentialDevices.push(dev);

        if (!device) {
            tryNextDevice();
        }
    }

    function tryNextDevice() {
        // If potentialDevices is empty, device will be undefined.
        // That will get us back here next time a device is connected.
        device = potentialDevices.shift();
        if (device) {
            device.open({ stopBits: 0, bitRate: 115200, ctsFlowControl: 0 }, deviceOpened);
        }
    }

    var watchdog = null;
    function deviceOpened(dev) {
        if (!dev) {
            // Opening the port failed.
            tryNextDevice();
            return;
        }
        device.set_receive_handler('arduino',processData);
    };

    ext._deviceRemoved = function(dev) {
        if(device != dev) return;
        device = null;
    };

    ext._shutdown = function() {
        if(device) device.close();
        device = null;
    };

    ext._getStatus = function() {
        if(!device) return {status: 1, msg: 'Arduino disconnected'};
        if(watchdog) return {status: 1, msg: 'Probing for Arduino'};
        return {status: 2, msg: 'Arduino connected'};
    }

    var descriptor = {};
	ScratchExtensions.register('EDA 44', descriptor, ext, {type: 'serial'});
})({});
