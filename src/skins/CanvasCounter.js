/**
 *  File    : skins/CanvasCounter.js
 *  Created : 10/05/2016
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  JClic.js
 *  An HTML5 player of JClic activities
 *  https://projectestac.github.io/jclic.js
 *
 *  @source https://github.com/projectestac/jclic.js
 *
 *  @license EUPL-1.1
 *  @licstart
 *  (c) 2000-2016 Catalan Educational Telematic Network (XTEC)
 *
 *  Licensed under the EUPL, Version 1.1 or -as soon they will be approved by
 *  the European Commission- subsequent versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *
 *  You may obtain a copy of the Licence at:
 *  https://joinup.ec.europa.eu/software/page/eupl
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  Licence for the specific language governing permissions and limitations
 *  under the Licence.
 *  @licend
 */

define([
  "jquery",
  "./Counter",
  "../boxes/AbstractBox"
], function ($, Counter, AbstractBox) {

  /**
   *
   * This special case of [Counter](Counter.html) displays information into an HTML canvas
   * contained in its `box` member.
   * @param {string} id - The type of information stored on this counter
   * @param {?AbstractBox} parent - The AbstractBox to which this one belongs
   * @param {?AWT.Container} container - The container where this box is placed.
   * @param {?BoxBase} boxBase - The object where colors, fonts, border and other graphic properties
   * @param {AWT.Rectangle=} rect - An optional rectangle with the initial position and size of this counter
   */
  var CanvasCounter = function (id, parent, container, boxBase, rect) {

    // CanvasCounter extends [Counter](Counter.html)
    Counter.call(this, id);

    this.box = new AbstractBox(parent, container, boxBase);
    this.box.cc = this;
    this.box.updateContent = this.updateBoxContent;
    if(rect)
      this.box.setBounds(rect);
  };

  CanvasCounter.prototype = {
    constructor: CanvasCounter,
    /**
     * The AbstractBox this counter uses as a display
     * @type {AbstractBox} */
    box: null,
    /**
     * The realized image used by this box content to display digits
     * @type {external:HTMLImageElement} */
    img: null,
    /**
     * Current size of the digits
     * @type {AWT.Dimension} */
    dSize: null,
    /**
     * The origin of the digits (as a sprites) on `img`
     * @type {AWT.Point} */
    origin: null,
    /**
     *
     * Paints the value of this counter on screen
     * (overrides same method in {@link Counter})
     */
    refreshDisplay: function () {
      this.box.container.invalidate(this.box.getBounds()).update();
    },
    /**
     *
     * Sets the image to be used as a source for drawing the counters
     * @param {external:HTMLImageElement} img - The image to be used as source
     * @param {AWT.Point} origin - The origin of the digit sprites on `img`
     * @param {AWT.Dimension} digitSize - Size of digits
     */
    setSource: function (img, origin, digitSize) {
      this.img = img;
      this.origin = origin;
      this.dSize = digitSize;
      this.refreshDisplay();
    },
    /**
     *
     * Draws the counter on the provided Canvas context
     * @param {external:CanvasRenderingContext2D} ctx - The canvas rendering context used to draw the
     * box content.
     * @param {AWT.Rectangle=} dirtyRegion - The area that must be repainted. `null` refers to the whole box.
     */
    updateBoxContent: function (ctx, dirtyRegion) {

      // NoTE: `this` refers to the `box` member of CanvasCounter

      if (this.cc.img === null)
        return false;

      var w, d;
      var marginW = (this.dim.width - 3 * this.cc.dSize.width) / 2;
      var marginH = (this.dim.height - this.cc.dSize.height) / 2;

      var valr = this.getDisplayValue();

      for (var k = false, i = 0, j = 100; i < 3; i++, j /= 10) {
        if (!this.cc.enabled)
          d = 1;
        else {
          w = valr / j % 10;
          if (w !== 0) {
            k = true;
            d = 11 - w;
          }
          else
            d = k || i === 2 ? 11 : 1;
        }

        ctx.drawImage(this.img,
            this.cc.origin.x,
            this.cc.origin.y + this.cc.dSize.height * d,
            this.cc.origin.x + this.cc.dSize.width,
            this.cc.origin.y + this.cc.dSize.height * (d + 1),
            this.pos.x + marginW + this.cc.dSize.width * i,
            this.pos.y + marginH,
            this.pos.x + marginW + this.cc.dSize.width * (i + 1),
            this.pos.y + marginH + this.cc.dSize.height);
      }
      return true;
    }
  };

  // CanvasCounter extends Counter
  CanvasCounter.prototype = $.extend(Object.create(Counter.prototype), CanvasCounter.prototype);

  return CanvasCounter;

});
