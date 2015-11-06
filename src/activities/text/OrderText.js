//    File    : Order.js  
//    Created : 20/06/2015  
//    By      : fbusquet  
//
//    JClic.js  
//    HTML5 player of [JClic](http://clic.xtec.cat) activities  
//    https://github.com/projectestac/jclic.js  
//    (c) 2000-2015 Catalan Educational Telematic Network (XTEC)  
//    This program is free software: you can redistribute it and/or modify it under the terms of
//    the GNU General Public License as published by the Free Software Foundation, version. This
//    program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
//    even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
//    General Public License for more details. You should have received a copy of the GNU General
//    Public License along with this program. If not, see [http://www.gnu.org/licenses/].  

define([
  "jquery",
  "../../Activity",
  "./TextActivityBase"
], function ($, Activity, TextActivityBase) {

  /**
   * In this type of text activity users must put in order some words or paragrafs that have been
   * initially scrambled.
   * @exports OrderText
   * @class
   * @extends TextActivityBase
   * @param {JClicProject} project - The project to which this activity belongs
   */
  var OrderText = function (project) {
    TextActivityBase.call(this, project);
  };

  OrderText.prototype = {
    constructor: OrderText,
    /**
     * Whether to allow or not to scramble words among different paragraphs.
     * @type {boolean} */
    amongParagraphs: false,
    /**
     * 
     * Whether or not the activity uses random to scramble internal components
     * @returns {boolean}
     */
    hasRandom: function () {
      return true;
    },
    /**
     * 
     * When `true`, the activity mut always be scrambled
     * @returns {boolean}
     */
    shuffleAlways: function () {
      return true;
    },
    /**
     * 
     * Whether the activity allows the user to request help.
     * @returns {boolean}
     */
    helpSolutionAllowed: function () {
      return true;
    }    
  };

  // OrderText extends TextActivityBase
  OrderText.prototype = $.extend(Object.create(TextActivityBase.prototype), OrderText.prototype);

  /**
   * The {@link TextActivityBase.Panel} where this kind of text activities are played.
   * @class
   * @extends TextActivityBase.Panel
   * @param {Activity} act - The {@link Activity} to wich this Panel belongs
   * @param {JClicPlayer} ps - Any object implementing the methods defined in the 
   * [PlayStation](http://projectestac.github.io/jclic/apidoc/edu/xtec/jclic/PlayStation.html)
   * Java interface.
   * @param {external:jQuery=} $div - The jQuery DOM element where this Panel will deploy
   */
  OrderText.Panel = function (act, ps, $div) {
    TextActivityBase.Panel.call(this, act, ps, $div);
  };

  // Properties and methods specific to OrderText.Panel
  var ActPanelAncestor = TextActivityBase.Panel.prototype;
  OrderText.Panel.prototype = {
    constructor: OrderText.Panel,
    /**
     * Currently selected text target
     * @type {TextActivityDocument.TextTarget} */
    currentTarget: null,
    /**
     * 
     * Prepares the text panel
     */
    buildVisualComponents: function () {
      // TODO: Add transparent canvas with a BoxConnector
      this.act.document.style['target'].css.cursor = 'pointer';
      ActPanelAncestor.buildVisualComponents.call(this);
    },    
    /**
     * 
     * Creates a target DOM element for the provided target.
     * @param {TextActivityDocument.TextTarget} target - The target related to the DOM object to be created
     * @param {external:jQuery} $span -  - An initial DOM object (usually a `span`) that can be used
     * to store the target, or replaced by another type of object.
     * @returns {external:jQuery} - The jQuery DOM element loaded with the target data.
     */
    $createTargetElement: function (target, $span) {
      
      ActPanelAncestor.$createTargetElement.call(this, target, $span);

      var id = this.targets.length - 1;
      var idLabel = 'target' + ('000' + id).slice(-3);
      var thisPanel = this;

      $span.addClass('JClicTextTarget').bind('click', function (event) {
          event.textTarget = target;
          event.idLabel = idLabel;
          thisPanel.processEvent(event);
        });

      return $span;
    },
    /**
     * Swaps the position of two targets in the document
     * @param {TextActivityDocument.TextTarget} t1 - One target
     * @param {TextActivityDocument.TextTarget} t2 - Another target
     */
    swapTargets: function(t1, t2){
      var $span1 = t1.$span;
      var $span2 = t2.$span;
      var $marker = $('<span/>');      
      $marker.insertAfter($span2);
      $span2.detach();      
      $span2.insertAfter($span1);
      $span1.detach();
      $span1.insertAfter($marker);
      $marker.remove();
      
      var pos = t1.pos,
          $p = t1.$p;      
      t1.pos = t2.pos;
      t1.$p = t2.$p;      
      t2.pos = pos;
      t2.$p = $p;
    },
    /**
     * 
     * Basic initialization procedure
     */
    initActivity: function () {
      ActPanelAncestor.initActivity.call(this);

      if (!this.firstRun)
        this.buildVisualComponents();
      else
        this.firstRun = false;
      
      if(this.act.type==='orderWords' && !this.act.amongParagraphs){        
        // Group targets by paragraph
        var groups = [];
        var lastTarget = null;
        var currentGroup = [];
        
        for(var i in this.targets){
          var t = this.targets[i];
          if(lastTarget!==null && lastTarget.$p !== t.$p){
            groups.push(currentGroup);
            currentGroup = [];
          }
          currentGroup.push(t);
          lastTarget = t;
        }
        if(currentGroup.length > 0){
          groups.push(currentGroup);
        }        
        
        // Scramble group by group
        for(var g in groups){
          this.shuffleTargets(groups[g], this.act.shuffles);          
        }        
      }
      else {      
        this.shuffleTargets(this.targets, this.act.shuffles);
      }
      
      this.playing=true;
      
    },
    /**
     * 
     * Randomly shuffles a set of targets
     * @param {TextActivityDocument.TextTarget[]} targets - The set of targets to shuffle (can be all
     * document targets or just the targets belonging to the same paragraph, depending on the value of
     * `amongParagraphs` in {@link Activity}.
     * @param {number} steps - The number of times to shuffle the elements
     */
    shuffleTargets: function (targets, steps) {
      var nt = targets.length;
      if (nt > 1) {
        var repeatCount = 100;
        for (var i = 0; i < steps; i++) {
          var r1 = Math.floor(Math.random() * nt);
          var r2 = Math.floor(Math.random() * nt);
          if (r1 !== r2) {
            this.swapTargets(targets[r1], targets[r2]);
          }
          else {
            if(--repeatCount)
              i++;
          }
        }
      }
    },
    /**
     * 
     * Sets the current target
     * @param {TextActivityDocument.TextTarget} target - The currently selected target. Can be `null`.
     */
    setCurrentTarget: function(target){
      var targetCss = this.act.document.style['target'].css;
      
      if(this.currentTarget && this.currentTarget.$span)
        this.currentTarget.$span.css(targetCss);
      
      if(target && target.$span){
            target.$span.css({
              color: targetCss.background,
              background: targetCss.color});
      }
      
      this.currentTarget = target;
    },
    /**
     * 
     * Counts the number of targets that are at right position
     * @returns {number}
     */
    countSolvedTargets: function(){      
      var result = 0;
      for(var i in this.targets){
        var t = this.targets[i];
        if(t.num === t.pos)
          result ++;
      }
      return result;      
    },
    /**
     * 
     * Ordinary ending of the activity, usually called form `processEvent`
     * @param {boolean} result - `true` if the activity was successfully completed, `false` otherwise
     */
    finishActivity: function (result) {
      $('.JClicTextTarget').css('cursor', 'auto');      
      return ActPanelAncestor.finishActivity.call(this, result);
    },    
    /**
     * 
     * Main handler used to process mouse, touch, keyboard and edit events.
     * @param {HTMLEvent} event - The HTML event to be processed
     * @returns {boolean=} - When this event handler returns `false`, jQuery will stop its
     * propagation through the DOM tree. See: {@link http://api.jquery.com/on}
     */
    processEvent: function (event) {

      if (!ActPanelAncestor.processEvent.call(this, event))
        return false;

      var target = event.textTarget;
      
      switch (event.type) {
        case 'click':
          if (target && target !== this.currentTarget) {
            if (this.currentTarget) {
              this.swapTargets(target, this.currentTarget);
              this.setCurrentTarget(null);
              
              // Check and notify action
              var cellsAtPlace = this.countSolvedTargets();
              var ok = target.pos === target.num;
              this.ps.reportNewAction(this.act, 'PLACE', target.text, target.pos, ok, cellsAtPlace);
              
              // End activity or play event sound
              if (ok && cellsAtPlace === this.targets.length)
                this.finishActivity(true);
              else
                this.playEvent(ok ? 'actionOk' : 'actionError');

            } else {
              this.setCurrentTarget(target);
              this.playEvent('click');
            }
          }
          break;
        default:
          break;
      }      
      return true;
    }
  };

  // OrderText.Panel extends TextActivityBase.Panel
  OrderText.Panel.prototype = $.extend(Object.create(ActPanelAncestor), OrderText.Panel.prototype);

  // Register class in Activity.prototype
  Activity.CLASSES['@text.Order'] = OrderText;

  return OrderText;
});
