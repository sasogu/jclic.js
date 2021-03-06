/**
 *  File    : boxes/ActiveBox.js
 *  Created : 18/04/2015
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

/* global define */

define([
  "jquery",
  "./AbstractBox",
  "./ActiveBoxContent",
  "./ActiveBagContent",
  "../AWT",
  "../Utils"
], function ($, AbstractBox, ActiveBoxContent, ActiveBagContent, AWT, Utils) {
  /**
   * Objects of this class are widely used in JClic activities: cells in puzzles and associations,
   * messages and other objects are active boxes.
   *
   * The specific content, size and location of `ActiveBox` objects is determined by its
   * {@link ActiveBoxContent} member. Most ActiveBoxes have only one content, but some of them can
   * have a secondary or "alternative" content stored in the `altContent` field. This content is
   * used only when the `alternative` flag of the ActiveBox is `on`.
   *
   * Active boxes can host video and interactive media content (specified in the `mediaContent`
   * member of the {@link ActiveBoxContent} through its `hostedMediaPlayer` member.
   * @exports ActiveBox
   * @class
   * @extends AbstractBox
   * @param {?AbstractBox} parent - The AbstractBox to which this ActiveBox belongs
   * @param {?AWT.Container} container - The container where this box is placed.
   * @param {?BoxBase} boxBase - The object where colors, fonts, border and other graphic properties
   * of this box are defined.
   * @param {number=} setIdLoc - A numeric identifier, used to locate this box in a set of sibling objects.
   * @param {AWT.Rectangle=} rect - The initial bounds of the box.
   */
  var ActiveBox = function (parent, container, boxBase, setIdLoc, rect) {

    // ActiveBox extends AbstractBox
    AbstractBox.call(this, parent, container, boxBase);

    this.clear();
    if (typeof setIdLoc === 'number') {
      this.idLoc = setIdLoc;
      this.idAss = 0;
      this.idOrder = 0;
    }
    if (rect)
      this.setBounds(rect);
  };

  /**
   * Factory constructor that creates a new cell inside a JQuery DOM element.
   * @param {external:jQuery} $dom - The DOM element that will act as a container
   * @param {ActiveBoxContent} abc - The cell's content. Must not be null and have the `dimension`
   * member initialized.
   * @returns {ActiveBox}
   */
  ActiveBox.createCell = function ($dom, abc) {
    if (abc && abc.dimension) {
      var box = new ActiveBox();
      box.container = new AWT.Container();
      box.container.$div = $dom;
      box.setContent(abc);
      var $canvas = $('<canvas width="' + abc.dimension.width + '" height="' + abc.dimension.height + '"/>');
      var rect = new AWT.Rectangle(0, 0, abc.dimension.width, abc.dimension.height);
      box.setBounds(rect);
      $dom.append($canvas);
      box.update($canvas.get(-1).getContext('2d'), rect);
      return box;
    }
  };

  ActiveBox.prototype = {
    constructor: ActiveBox,
    /**
     * Identifier used to set the relative position of this box in a set.
     * @type {number} */
    idOrder: -1,
    /**
     * Identifier used to set a relative position in the space.
     * @type {number} */
    idLoc: -1,
    /**
     * Identifier used to establish relationships between cells of different sets (in associations)
     * @type {number} */
    idAss: -1,
    /**
     * Main content of this box
     * @type {ActiveBoxContent} */
    content: null,
    /**
     * Alternative content of this box
     * @type {ActiveBoxContent} */
    altContent: null,
    /**
     * Flag to check if this box has a 'hosted component'
     * @type {boolean} */
    hasHostedComponent: false,
    /**
     * The media player associated to this box
     * @type {ActiveMediaPlayer} */
    hostedMediaPlayer: null,
    /**
     * Indicates that this box is used as a background. When drawing, the clipping region must be respected.
     * @type {boolean} */
    isBackground: false,
    /**
     *
     * Returns the current content used by the box
     * @returns {ActiveBoxContent}
     */
    getCurrentContent: function () {
      return this.isAlternative() ? this.altContent : this.content;
    },
    /**
     *
     * Returns the current content, creating an empty one if needed.
     * @returns {ActiveBoxContent}
     */
    getContent: function () {
      if (!this.content)
        this.setContent(new ActiveBoxContent());
      return this.content;
    },
    /**
     *
     * Clears the current content
     */
    clear: function () {
      this.content = null;
      this.altContent = null;
      this.idOrder = -1;
      this.setInactive(true);
      if (!this.hasHostedComponent)
        this.setHostedComponent(null);
      this.setHostedMediaPlayer(null);
      if (this.$accessibleElement)
        this.$accessibleElement.html('');
      if (this.tmpTrans)
        this.tmpTrans = false;
      this.invalidate();
    },
    /**
     *
     * Checks if two ActiveBox objects have equivalent content
     * @param {ActiveBox} bx - The ActiveBox to check against this.
     * @param {boolean=} checkCase - When `true`, the comparing will be case-sensitive.
     * @returns {boolean} - `true` if both cells are equivalent.
     */
    isEquivalent: function (bx, checkCase) {
      return bx !== null &&
        this.content !== null &&
        this.content.isEquivalent(bx.content, checkCase);
    },
    /**
     *
     * Same functionality as {@link ActiveBox#isEquivalent isEquivalent}, but comparing the current content.
     * @param {ActiveBox} bx - The ActiveBox to check against this.
     * @param {boolean=} checkCase - When `true`, the comparing will be case-sensitive.
     * @returns {boolean}
     */
    isCurrentContentEquivalent: function (bx, checkCase) {
      return bx !== null &&
        this.getCurrentContent() !== null &&
        this.getCurrentContent().isEquivalent(bx.getCurrentContent(), checkCase);
    },
    /**
     *
     * Swaps the position of two active boxes
     * @param {ActiveBox} bx - The ActiveBox to swap with this one.
     */
    exchangeLocation: function (bx) {
      var pt = new AWT.Point(this.pos);
      var idLoc0 = this.idLoc;
      this.moveTo(bx.pos);
      bx.moveTo(pt);
      this.idLoc = bx.idLoc;
      bx.idLoc = idLoc0;
    },
    /**
     *
     * Copy the content of another ActiveBox into this one
     * @param {ActiveBox} bx - The ActiveBox from which to take the content
     */
    copyContent: function (bx) {
      this.idOrder = bx.idOrder;
      this.idAss = bx.idAss;
      this.content = bx.content;
      this.altContent = bx.altContent;
      if (this.content) {
        if (this.content.bb)
          this.setBoxBase(this.content.bb);
        if (this.content.border !== null && bx.hasBorder() !== this.content.border)
          this.setBorder(this.content.border);
      }
      this.setInactive(bx.isInactive());
      this.setInverted(bx.isInverted());
      this.setAlternative(bx.isAlternative());
      this.setHostedComponent(bx.getHostedComponent());
      this.hasHostedComponent = bx.hasHostedComponent;
      this.setHostedMediaPlayer(bx.hostedMediaPlayer);
      if (this.hostedMediaPlayer)
        this.hostedMediaPlayer.setVisualComponentVisible(!this.isInactive() && this.isVisible());
      if (this.$accessibleElement)
        this.$accessibleElement.html(this.toString());
    },
    /**
     *
     * Exhanges the content of this ActiveBox with another one
     * @param {ActiveBox} bx - The ActiveBox with which to exchange the content.
     */
    exchangeContent: function (bx) {
      var bx0 = new ActiveBox(this.getParent(), this.getContainerX(), this.boxBase);
      bx0.copyContent(this);
      this.copyContent(bx);
      bx.copyContent(bx0);
    },
    /**
     *
     * Sets the text content of this ActiveBox.
     * @param {strint} tx - The text to set.
     */
    setTextContent: function (tx) {
      // only plain text!
      if (!tx)
        tx = '';
      if (!this.content)
        this.content = new ActiveBoxContent();
      this.content.rawText = tx;
      this.content.text = tx;
      this.content.mediaContent = null;
      this.content.img = null;

      this.setHostedComponent(null);
      this.setInactive(false);
      this.checkHostedComponent();
      this.setHostedMediaPlayer(null);

      if (this.$accessibleElement)
        this.$accessibleElement.html(this.toString());
    },
    /**
     *
     * Sets the default value to `idAss`
     */
    setDefaultIdAss: function () {
      this.idAss = this.content === null ? -1 : this.content.id;
    },
    /**
     *
     * Checks if this ActiveBox is at its original place.
     * @returns {boolean}
     */
    isAtPlace: function () {
      return this.idOrder === this.idLoc;
    },
    /**
     *
     * Sets the {@link ActiveBoxContent} of this ActiveBox
     * @param {(ActiveBoxContent|ActiveBagContent)} abc - Object containing the content to set.
     * @param {number} i - When `abc` is an {@link ActiveBagContent}, this field indicates an
     * index in the content array.
     */
    setContent: function (abc, i) {
      if (abc instanceof ActiveBagContent) {
        if (i < 0)
          i = this.idOrder;
        if (i >= abc.getNumCells())
          return;
        if (abc.bb !== this.boxBase)
          this.setBoxBase(abc.bb);

        // `abc` is now an [ActiveBoxContent](ActiveBoxContent.html)
        abc = abc.getActiveBoxContent(i);
      }
      this.setHostedComponent(null);
      this.setHostedMediaPlayer(null);
      this.content = abc;
      if (abc) {
        if (abc.animatedGifFile && !this.specialShape) {
          var url = 'url(' + abc.animatedGifFile + ')';
          var $hc = $('<span/>').css({
            'background-image': url,
            //'background-size': 'contain',
            'background-position': 'center',
            'background-repeat': 'no-repeat'
          });
          // Save background image for later use
          $hc.data('background-image', url);

          if (abc.imgClip !== null) {
            $hc.css({
              'background-origin': 'border-box',
              'background-position': -abc.imgClip.pos.x + 'px ' + (-abc.imgClip.pos.y) + 'px'
              // TODO: Use background-size only when the original image must be compressed
              //,'background-size': abc.imgClip.dim.width + 'px ' + abc.imgClip.dim.height + 'px'
            });
          }
          this.setHostedComponent($hc);
        }

        if (abc.bb !== this.boxBase)
          this.setBoxBase(abc.bb);

        if (abc.innerHtmlText)
          this.setHostedComponent($('<div/>').html(abc.innerHtmlText));

        if (abc.hasOwnProperty('border') && this.hasBorder() !== abc.border)
          this.setBorder(abc.border);
        this.setInactive(false);
        if (abc.amp)
          this.setHostedMediaPlayer(abc.amp);
        this.checkHostedComponent();
        this.checkAutoStartMedia();
      } else
        this.clear();

      this.invalidate();
      if (this.$accessibleElement)
        this.$accessibleElement.html(this.toString());
    },
    /**
     *
     * Sets the {@link ActiveBoxContent} that will act as an alternative content (`altContent` field)
     * of this ActiveBox,
     * @param {(ActiveBoxContent|ActiveBagContent)} abc - Object containing the content to set.
     * @param {number} i - When `abc` is an {@link ActiveBagContent}, this field indicates an
     * index in the content array.
     */
    setAltContent: function (abc, i) {
      if (abc instanceof ActiveBagContent) {
        if (i < 0)
          i = this.idOrder;
        // `abc` is now an [ActiveBoxContent](ActiveBoxContent.html)
        abc = abc.getActiveBoxContent(i);
      }
      this.altContent = abc;
      this.checkHostedComponent();
      if (this.isAlternative() && this.hostedMediaPlayer)
        this.setHostedMediaPlayer(null);

      if (this.$accessibleElement) {
        this.$accessibleElement.html(this.toString());
        this.$accessibleElement.prop('disabled', true);
      }
    },
    /**
     * Sets the current content of this ActiveBox
     * @param {ActiveBoxContent} abc - The content to set.
     */
    setCurrentContent: function (abc) {
      if (this.isAlternative())
        this.setAltContent(abc);
      else
        this.setContent(abc);
      this.invalidate();
    },
    /**
     *
     * Puts this ActiveBox in "alternative" mode, meaning that `altContent` will be used instead of `content`
     */
    switchToAlt: function () {
      if (this.isAlternative() || !this.altContent || this.altContent.isEmpty())
        return false;
      this.setHostedComponent(null);
      this.setHostedMediaPlayer(null);
      this.setAlternative(true);
      this.tmpTrans = false;
      this.checkHostedComponent();
      this.checkAutoStartMedia();

      if (this.$accessibleElement)
        this.$accessibleElement.html(this.toString());

      return true;
    },
    /**
     *
     * Checks the presence of content susceptible to be treated as HTML DOM embedded in this ActiveBox.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas}
     */
    checkHostedComponent: function () {
      if (this.hasHostedComponent)
        return;
      var abc = this.getCurrentContent();
      var bb = this.getBoxBaseResolve();
      if (!this.isInactive() && abc && abc.htmlText) {
        if (abc.innerHtmlText) {
          var css = bb.getCSS();
          css['text-align'] = abc.txtAlign.h.replace('middle', 'center');

        }
      }
    },
    /**
     *
     * Checks if the call has a {@link MediaContent} set to `autostart`, and launches it when found.
     */
    checkAutoStartMedia: function () {
      var cnt = this.getContent();
      if (cnt && cnt.mediaContent && cnt.mediaContent.autoStart && cnt.amp) {
        cnt.amp.playNow(this);
      }
    },
    /**
     *
     * Draws the content of this Activebox on the specified canvas context.
     * @param {external:CanvasRenderingContext2D} ctx - The canvas rendering context used to draw the
     * box content.
     * @param {AWT.Rectangle=} dirtyRegion - The area that must be repainted. `null` refers to the whole box.
     */
    updateContent: function (ctx, dirtyRegion) {

      var abc = this.getCurrentContent();
      var bb = this.getBoxBaseResolve();

      if (this.isInactive() || !abc || this.dim.width < 2 || this.dim.height < 2)
        return true;

      if (dirtyRegion && !this.intersects(dirtyRegion))
        return false;

      var imgRect = null;

      if (abc.img && !this.tmpTrans) {
        try {
          if (abc.imgClip) {
            var r = abc.imgClip.getBounds();
            var img = abc.img;
            if (!abc.imgClip.isRect()) {
              // Prepare a temporary `canvas` object that will contain the clipped image
              var tmpCanvas = document.createElement('canvas');
              tmpCanvas.width = r.pos.x + r.dim.width;
              tmpCanvas.height = r.pos.y + r.dim.height;
              var tmpCtx = tmpCanvas.getContext('2d');
              // Set the clipping region
              abc.imgClip.clip(tmpCtx);
              // Draw the original image
              tmpCtx.drawImage(abc.img, 0, 0);
              // Use the temporary canvas as a source image
              // (as seen on: [http://stackoverflow.com/questions/7242006/html5-copy-a-canvas-to-image-and-back])
              img = tmpCanvas;
            }
            ctx.drawImage(img,
              Math.max(0, r.pos.x), Math.max(0, r.pos.y), Math.min(img.width, r.dim.width), Math.min(img.height, r.dim.height),
              this.pos.x, this.pos.y, this.dim.width, this.dim.height);
          } else {
            var imgw, imgh;
            var compress = false;
            imgw = abc.img.naturalWidth;
            if (imgw === 0)
              imgw = this.dim.width;
            imgh = abc.img.naturalHeight;
            if (imgh === 0)
              imgh = this.dim.height;
            var scale = 1.0;
            if (Utils.settings.COMPRESS_IMAGES &&
              (this.dim.width > 0 && this.dim.height > 0) &&
              (imgw > this.dim.width || imgh > this.dim.height)) {
              scale = Math.min(this.dim.width / imgw, this.dim.height / imgh);
              imgw *= scale;
              imgh *= scale;
              compress = true;
            }
            var xs = abc.imgAlign.h === 'left' ? 0
              : abc.imgAlign.h === 'right' ? this.dim.width - imgw
                : (this.dim.width - imgw) / 2;
            var ys = abc.imgAlign.v === 'top' ? 0
              : abc.imgAlign.v === 'bottom' ? this.dim.height - imgh
                : (this.dim.height - imgh) / 2;
            if (compress) {
              ctx.drawImage(abc.img, this.pos.x + xs, this.pos.y + ys, imgw, imgh);
            } else
              ctx.drawImage(abc.img, this.pos.x + xs, this.pos.y + ys);

            if (abc.avoidOverlapping && abc.text)
              imgRect = new AWT.Rectangle(
                Math.max(0, xs), Math.max(0, ys),
                Math.min(this.dim.width, imgw), Math.min(this.dim.height, imgh));
          }
        } catch (ex) {
          Utils.log('warn', 'Unable to draw image "%s": %s', abc.imgName, ex.message);
        }
      }
      if (abc.text && abc.text.length > 0) {
        var px = this.pos.x;
        var py = this.pos.y;
        var pWidth = this.dim.width;
        var pHeight = this.dim.height;
        if (imgRect) {
          // There is an image in the ActiveBox
          // Try to compute the current space available for text
          var prx = [0, imgRect.pos.x, imgRect.pos.x + imgRect.dim.width, pWidth];
          var pry = [0, imgRect.pos.y, imgRect.pos.y + imgRect.dim.height, pHeight];
          var rr = [
            // Calc four rectangles inside BoxBag, sourronding imgRect
            // Top rectangle:
            new AWT.Rectangle(prx[0], pry[0], prx[3], pry[1]),
            // Bottom rectangle:
            new AWT.Rectangle(prx[0], pry[2], prx[3], pry[3] - pry[2]),
            // Left rectangle:
            new AWT.Rectangle(prx[0], pry[0], prx[1], pry[3]),
            // Right rectangle:
            new AWT.Rectangle(prx[2], pry[0], prx[3] - prx[2], pry[3])
          ];
          //
          // Find the rectangle with highest surface, and in accordance
          // with the `txtAlign` values of the current
          // [ActiveBoxContent](ActiveBoxContent)
          var rmax = rr[0];
          var maxSurface = rmax.dim.width * rmax.dim.height;
          for (var i = 1; i < rr.length; i++) {
            var s = rr[i].dim.width * rr[i].dim.height;
            if (s > maxSurface - 1) {
              if (Math.abs(s - maxSurface) <= 1) {
                var b = false;
                switch (i) {
                  case 1:
                    b = abc.txtAlign.v === 'bottom';
                    break;
                  case 2:
                    b = abc.txtAlign.h === 'left';
                    break;
                  case 3:
                    b = abc.txtAlign.h === 'right';
                    break;
                }
                if (!b)
                  continue;
              }
              maxSurface = s;
              rmax = rr[i];
            }
          }
          // Finally, this is the surface available to draw text:
          px += rmax.pos.x;
          py += rmax.pos.y;
          pWidth = rmax.dim.width;
          pHeight = rmax.dim.height;
        }

        // Calc available width and height, discounting margins
        var availWidth = Math.max(5, pWidth - 2 * bb.textMargin);
        var availHeight = Math.max(5, pHeight - 2 * bb.textMargin);

        // Calc the size of each line
        var lines = bb.prepareText(ctx, abc.text, availWidth, availHeight);

        ctx.font = bb.font.cssFont();
        ctx.textBaseline = 'hanging';
        var lineHeight = bb.font.getHeight();
        var totalHeight = lineHeight * lines.length;

        // Calc the vertical co-ordinate of the first line
        // Default is 'middle'

        var y = py + bb.textMargin + (abc.txtAlign.v === 'top' ? 0
          : abc.txtAlign.v === 'bottom' ?
            availHeight - totalHeight : (availHeight - totalHeight) / 2);

        for (var l = 0; l < lines.length; l++ , y += lineHeight) {
          // Calc the horizontal position of each line
          // Default is 'middle'
          var x = px + bb.textMargin + (abc.txtAlign.h === 'left' ? 0
            : abc.txtAlign.h === 'right' ?
              availWidth - lines[l].size.width
              : (availWidth - lines[l].size.width) / 2);

          if (bb.shadow) {
            // Render text shadow
            var d = Math.max(1, bb.font.size / 10);
            ctx.fillStyle = bb.shadowColor;
            ctx.fillText(lines[l].text, x + d, y + d);
          }
          // Render text
          ctx.fillStyle = this.isInverted() ? bb.backColor
            : this.isAlternative() ? bb.alternativeColor : bb.textColor;
          ctx.fillText(lines[l].text, x, y);
        }
      }
      return true;
    },
    /**
     *
     * Gets the `description` field of the current {@link ActiveBoxContent}
     * @returns {string}
     */
    getDescription: function () {
      return this.content ? this.content.getDescription() : '';
    },
    /**
     * 
     * Gets a descriptive text for this ActiveBox
     * @returns {String}
     */
    toString: function () {
      return (this.role !== 'cell' ? Utils.getMsg(this.role) : '') + (this.getCurrentContent() || '-').toString();
    },
    /**
     *
     * Plays the action or media associated with this ActiveBox
     * @param {PlayStation} ps - Usually, a {@link JClicPlayer}
     */
    playMedia: function (ps) {
      var abc = this.getCurrentContent();
      if (abc && abc.mediaContent) {
        Utils.log('debug', 'Playing: %s', abc.mediaContent.toString());
        ps.playMedia(abc.mediaContent, this);
        return true;
      }
      return false;
    },
    /**
     *
     * Sets the hosted media player of this ActiveBox
     * @param {ActiveMediaPlayer} amp - The media player.
     */
    setHostedMediaPlayer: function (amp) {
      var old = this.hostedMediaPlayer;
      this.hostedMediaPlayer = amp;
      if (old && old !== amp)
        old.linkTo(null);
      if (amp)
        amp.linkTo(this);
    },
    /**
     *
     * Sets a new size and/or dimension to this box.
     * @param {(AWT.Rectangle|number)} rect - An AWT.Rectangle object, or the `x` coordinate of the
     * upper-left corner of a new rectangle.
     * @param {number=} y - `y` coordinate of the upper-left corner of the new rectangle.
     * @param {number=} w - Width of the new rectangle.
     * @param {number=} h - Height of the new rectangle.
     */
    setBounds: function (rect, y, w, h) {
      if (typeof rect === 'number')
        // arguments are co-ordinates and size
        rect = new AWT.Rectangle(rect, y, w, h);
      // Rectangle comparision
      if (this.equals(rect))
        return;
      AbstractBox.prototype.setBounds.call(this, rect);
      if (this.hostedMediaPlayer)
        this.hostedMediaPlayer.checkVisualComponentBounds(this);
    },
    /**
     *
     * Places and resizes {@link AbstractBox#$hostedComponent $hostedComponent}, based on the size
     * and position of this box.
     * @param {boolean} sizeChanged - `true` when this {@link ActiveBox} has changed its size
     */
    setHostedComponentBounds: function (sizeChanged) {
      if (this.$hostedComponent) {
        AbstractBox.prototype.setHostedComponentBounds.call(this, sizeChanged);
        var abc = this.getCurrentContent();
        if (sizeChanged && abc && abc.animatedGifFile && abc.img /* && !this.specialShape */) {
          var img = abc.img;
          var w = Math.max(img.naturalWidth, this.dim.width);
          var h = Math.max(img.naturalHeight, this.dim.height);
          var scale = 1;
          var bgSize = '';
          if (abc.imgClip) {
            var r = abc.imgClip.getBounds();
            if (this.dim.width < r.dim.width || this.dim.height < r.dim.height) {
              scale = Math.min(this.dim.width / r.dim.width, this.dim.height / r.dim.height);
              bgSize = w * scale + 'px ' + h * scale + 'px';
            }
            this.$hostedComponent.css({
              'background-position': -abc.imgClip.pos.x * scale + 'px ' + (-abc.imgClip.pos.y) * scale + 'px',
              'background-size': bgSize
            });
          } else {
            if (this.dim.width < w || this.dim.height < h) {
              scale = Math.min(this.dim.width / w, this.dim.height / h);
              bgSize = w * scale + 'px ' + h * scale + 'px';
            }
            this.$hostedComponent.css({
              'background-size': bgSize
            });
          }
        }
      }
    },
    /**
     * 
     * Builds a hidden `buton` that will act as a accessible element associated to the canvas area
     * of this ActiveBox.
     * The button will be created only when `CanvasRenderingContext2D` has a method named `addHitRegion`.
     * See https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Hit_regions_and_accessibility
     * for more information and supported browsers.
     * @param {external:jQuery} $canvas - The `canvas` where this `ActiveBox` will deploy, wrapped up in a jQuery object
     * @param {external:jQuery} $clickReceiver - The DOM element that will be notified  when `$accessibleElement` is activated.
     * @param {external:jQuery=} $canvasGroup - Optional DOM element containing the accessible element. Useful to group cells in associations. When `null`, the element belongs to $canvas.
     * @param {string=} eventType - Type of event sent to $clickReceiver. Default is `click`.
     * @returns {external:jQuery} - The accessible element associated to this ActiveBox.
     */
    buildAccessibleElement: function ($canvas, $clickReceiver, $canvasGroup, eventType) {
      if (Utils.settings.CANVAS_HITREGIONS) {
        if (this.$accessibleElement)
          this.$accessibleElement.remove();
        if ($canvas.width() > 0 && $canvas.height() > 0) {
          var id = Math.round(Math.random() * 100000),
            thisBox = this;
          var disabled = this.isInactive() && !this.accessibleAlwaysActive;
          this.$accessibleElement = $('<button/>', {
            tabindex: disabled ? -1 : 0,
            id: 'AE' + id,
            disabled: disabled
          })
            .html(this.toString())
            .click(function (ev) {
              // Check if event was produced by a mouse click
              if (ev.originalEvent && (ev.originalEvent.pageX !== 0 || ev.originalEvent.pageY !== 0)) {
                // Mouse clicks should be processed odirectly by the canvas, so ignore this accessible event
                return true;
              }
              Utils.log('debug', 'Click on accessible element: %s', thisBox.toString());
              var $event = $.Event(eventType || 'click');
              var bounds = thisBox.getBounds();
              var offset = $canvas.offset();
              $event.pageX = offset.left + bounds.pos.x + bounds.dim.width / 2;
              $event.pageY = offset.top + bounds.pos.y + bounds.dim.height / 2;
              $clickReceiver.trigger($event);
              return false;
            });
          ($canvasGroup || $canvas).append(this.$accessibleElement);
          var elem = this.$accessibleElement.get(-1);
          try {
            var ctx = $canvas.get(-1).getContext('2d');
            this.shape.preparePath(ctx);
            ctx.addHitRegion({ id: 'REG' + id, control: elem });
            if (Utils.settings.CANVAS_HITREGIONS_FOCUS)
              ctx.drawFocusIfNeeded(elem);
          } catch (ex) {
            Utils.log('error', 'Unable to build accessible element for canvas in: %s (%s)', this.toString(), ex);
          }
        }
      }
      return this.$accessibleElement;
    }
  };

  // ActiveBox extends AbstractBox
  ActiveBox.prototype = $.extend(Object.create(AbstractBox.prototype), ActiveBox.prototype);

  return ActiveBox;
});
