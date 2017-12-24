/*:
 * @plugindesc Enables keyboard input on the name input scene.
 * @author Dreadwing93
 *
 * @help
 * This plugin allows the keyboard to be used to input names.
 * It also adds a plugin command to bypass the 16 character limit
 * and optionally hide the face picture.
 *
 * Syntax examples:
 * textInput 1 20 show
 * textInput 1 25 hide
 * textInput 1 300px show
 *
 * The first parameter is the actor's id.
 * The second parameter is the max character length. if it ends with
 * "px", then the length will be in pixels instead of characters.
 * The third parameter is whether the actor's face is shown or hidden.
 *
 * ___
 *
 * If you enjoy this plugin, consider supporting me on Patreon.
 *
 * https://www.patreon.com/dreadwing
 *
 */

(function(){

	input=document.createElement('input');
	input.setAttribute('type','text');
	input.setAttribute('style',"opacity:0");
	document.body.appendChild(input);
	input.onkeyup=input.onkeydown=function(e){
		if(SceneManager._scene.constructor!==Scene_Name){
			e.preventDefault();
			//document.body.focus();
		}
		//this.e=e;
		setTimeout(this.updateValue);
	};
	input.updateValue=(function(){
		var scene = SceneManager._scene;
		if(scene.constructor===Scene_Name){
			var field=scene._editWindow;
			if(field.textWidth(this.value)>field.pixelLength() ){
				this.value=field._name;
			}else{
				field._name=this.value;
			}
			field._index=this.selectionStart;
			field.refresh();
		}
	}).bind(input);

	Window_NameEdit.prototype.restoreDefault = function() {
	    this._name = this._defaultName;
	    while(this.textWidth(this._name)>this.pixelLength()){
	    	this._name=this._name.slice(0,this._name.length-1);
	    }
	    this._index = this._name.length;
	    this.refresh();
	    return this._name.length > 0;
	};

	Scene_Name.prototype.prepare = function(actorId, maxLength, pixelLength, showface) {
	    this._actorId = actorId;
	    this._maxLength = maxLength;
	    this._pixelLength = pixelLength;
	    this._showface = showface===false?false:true;
	    console.log(arguments);
	};

	Window_NameEdit.prototype.pixelLength = function() {
	    return SceneManager._scene._pixelLength || this._maxLength*this.charWidth();
	};

	Window_NameEdit.prototype.left = function() {
		var nameCenter;
		if (SceneManager._scene._showface){
    		nameCenter = (this.contentsWidth() + this.faceWidth()) / 2;
		}else{
			nameCenter = this.contentsWidth() / 2;
		}
	    var nameWidth = SceneManager._scene._pixelLength || (this._maxLength + 1) * this.charWidth();
	    return Math.min(nameCenter - nameWidth / 2, this.contentsWidth() - nameWidth);
	};

	Window_NameEdit.prototype.refresh = function() {
	    this.contents.clear();
	    if (SceneManager._scene._showface) this.drawActorFace(this._actor, 0, 0);
	    var underlineCount = Math.floor(SceneManager._scene._pixelLength ? SceneManager._scene._pixelLength/this.charWidth() : this._maxLength);
	    for (var i = 0; i < underlineCount; i++) {
	        this.drawUnderline(i);
	    }
	    //for (var j = 0; j < this._name.length; j++) {
	    //    this.drawChar(j);
	    //}
	    var rect = this.itemRect(0);
	    this.resetTextColor();
	    this.drawText(this._name, rect.x, rect.y);
	    rect = this.itemRect(this._index);
	    this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
	};

	Window_NameEdit.prototype.setCursorRect = function(x, y, width, height) {
		var owidth = width;
		var charheight = height;
		if (this._name===input.value){
			x=this.left()+this.textWidth(input.value.slice(0,input.selectionStart));
			width=this.textWidth(input.value.slice(input.selectionStart,input.selectionEnd));
		}else{
			x=this.left()+this.textWidth(this._name);
			width=0;
		}
		if(!width){
			width=owidth/2;
			x-=owidth/4;
		}
	    Window.prototype.setCursorRect.apply(this,arguments);
	};

	var override_input_onkeydown=Input._onKeyDown;
	Input._onKeyDown = function(e) {
		if(SceneManager._scene.constructor===Scene_Name && SceneManager._scene._editWindow){
			if (e.keyCode==13){//enter
				SceneManager._scene._inputWindow.onNameOk();
				return;
			}
			if(document.activeElement===input)return;
			if(input.value!==SceneManager._scene._editWindow._name) input.value=SceneManager._scene._editWindow._name;
			input.focus();
			input.onkeydown(e);
			return;
		}
	    return override_input_onkeydown.apply(this,arguments);
	};
	var override_edit_add = Window_NameEdit.prototype.add;
	Window_NameEdit.prototype.add = function(ch) {
		if(this.textWidth(this._name+ch)>this.pixelLength()){return;}
		if (this._name!==input.value){
			input.value=this._name;
		}
		this._name=input.value.slice(0,input.selectionStart)+ch+input.value.slice(input.selectionEnd,Infinity);
		this._index=(input.value.slice(0,input.selectionStart)+ch).length;
		input.value=this._name;
		input.selectionStart=input.selectionEnd=this._index;
		this.refresh();
		return true;
	};
	var override_edit_back = Window_NameEdit.prototype.back;
	Window_NameEdit.prototype.back = function() {
		if (this._name!==input.value){
			input.value=this._name;
		}
		var selectionWidth=input.selectionEnd - input.selectionStart;
		if(selectionWidth){
			this._name=input.value.slice(0,input.selectionStart)+input.value.slice(input.selectionEnd,Infinity);
			this._index=(input.value.slice(0,input.selectionStart)).length;
		}else{
			this._name = input.value.slice(0,input.selectionStart-1)+input.value.slice(input.selectionEnd,Infinity);
			this._index=(input.value.slice(0,input.selectionStart-1)).length;
		}
		input.value=this._name;
		input.selectionStart=input.selectionEnd=this._index;
		this.refresh();
		return true;
	};

	var override_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		override_pluginCommand.apply(this,arguments);
		if (command.toLowerCase()!=='textinput'){ return; }
		var actor, charLength, pixelLength, showface;
		actor = Number(args[0]);
		if (String(args[1]).toLowerCase().indexOf('px')>0){
			pixelLength=parseInt(args[1]);
		}else{
			charLength=parseInt(args[1]);
		}
		switch(String(args[2]).toLowerCase()){
			case "0":
			case "false":
			case "hide":
				showface=false;
				break;
			default:
				showface=true;
		}
		SceneManager.push(Scene_Name);
		SceneManager.prepareNextScene(actor, charLength, pixelLength, showface);
	};

})();