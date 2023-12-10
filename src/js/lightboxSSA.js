// LightboxSSA 

// version 0.5 6/12/2023

// Copyright 2020-2023 Chris Dennis

//    This file is part of LightboxSSA.
//
//    LightboxSSA is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    LightboxSSA is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with Foobar.  If not, see <https://www.gnu.org/licenses/>.

// LightboxSSA was forked in May 2020 from:
// Lightbox v2.11.1 by Lokesh Dhakar
// Copyright Lokesh Dhakar
// Released under the MIT license
// https://github.com/lokesh/lightbox2/blob/master/LICENSE
// More info: http://lokeshdhakar.com/projects/lightbox2/

// data- attributes   -- get them from the img or figure or anchor if not data-
// - data-lightbox="galleryname"
// - data-aspect
// - data-title="image title"
// - data-alt="alt info"
// - data-url="http... "   - link when lightboxed image is clicked - optional - if present, we wrap the <img> with a <a>
    // OR -- don't wrap it, just add an on.click and a pointer
// Oh2 -- no javascript? should fall back to showing the image.  or fallback to just showing the image/gallery?  The latter
// I'll change that to put the data- attributes in the <fig>, so no wrapping <a> required.
//  -- see enable() applying click to anything with a data-lightbox
//  -- so user can do <a data-lightbox...> if they want non-JS clickability

// ongoing issues
// - cSOT on image and imagePrev/Next instead of figure?

// TODO
// - more pure functions -- ??move them outside the class -- need lbssa prefix if so
// Touch screens:
//  - simple touch only to start lightbox
//  - touch outside image to close -- NOT on clickable areas
//  - swipe l/r to change image (already done?)
//     -- BUT distinguish swipe from simple touch??  on image and imageprev/next   
//        those areas ought to respnd to either...
///  -- maybe, detect if touchscreen, add another layer above to trap swipes.  or remove imageprev/next and let image do 
//  see https://pantaley.com/blog/How-to-separate-Drag-and-Swipe-from-Click-and-Touch-events/ for ideas
//  - make caption transparent to touches
//  - simple touch image to go to url if any

// - trap back button to call dismantle
// - demo/test site as part of this repo
// - wrap_around option is ignored (always wraps) except with keyboard nav.  //   (no it isn't, but arrows aren't removed)
// - centring of lightbox image seems to ignore browser window scroll bar -- how to stop that?
// - keyboard < > esc -- reinstate previous effort
    // - keyboard < > esc -- also back button to close lb
// - more configuration e.g. image margin/radius/colour, caption styling, etc.  NO! use CSS, and have LESS in config
// - sort on onError/placeholder
// - preload neighbours
//  - highlight something during touchmove
// - hide/disable prev or nav if only two images?
// - more Aria stuff?
// - validate option values from 'user' and document user-settable ones
// - maybe put X in corner of non-hover screens
// - still get multiple jumps esp on phone
// - nav heights -- make secondary ones same height as main; all should be e.g. 50vh

// DONE
// - if figure, use enclosed img for source
// - if img, use its src
// - if a, use its href and enclosed img
// - not very smooth start-up
// - need new mechanism for setting options now that loading this js is deferred e.g. set an easter egg
// - hide <> if only one image
// - deal with missing images, e.g. set default size, use placeholder
// - thin black border around images ? related to border vs transform/translate - fixed by using flex instead
// - flex - div for each image
// - not working on mobile!
// - touch-action didn't help -- remove from here and css
// - disable scroll thing - to get rid of scroll bar
// - window resize (e.g. pressing F12) breaks aspect ratio
// - fine-tune prev/next arrows on narrow screens: remove padding in the .png's, and position the arrow
//     a small distance from the edge -- see https://css-tricks.com/almanac/properties/b/background-position/
// - hide <> arrows on swipable / narrow screens 
// - debounce prev/next clicks
//   - and/or allow prev/next touches on edges of image
// - on click/mouse/pointer events should return quickly -- maybe just prevent further clicks, and then call start() from a timeout.
// - swiping
// - get caption from figcaption
// - use title as tool tip? or add details?
// - loading spinner
// - use srcset that we've carefully parsed
// - clickThroughImage -- to url, if external, config option to do target=_blank
// - single-image lightbox -- need no < > arrows
// - ditto -- need bigger image, otherwise there's not much point.
// - check getSiblings and pointer stuff

class LightboxSSA {

    constructor (options) {
        //console.log("CCCCCCCCCCCCCCCCConstructor options=", options);
        this.album = [];
        this.currentImageIndex = 0;
        // NOTE: these have to be lowercase or snake_case because of the way they can be
        // set e.g. via Hugo params
        this.defaults = {
            active: true,   // Only used by Hugo; not in this Javascript
            fade_duration: 600,
            overlay_opacity: 1.0,   
            max_width: 95,  // %
            max_height: 95,
            wrap_around: true,
            disable_scrolling: false, // hide scrollbar so that lightbox uses full area of window
            swipe_min: 0.1,  // minimum swipe distance (as fraction screen size) 
            placeholder_image: '../images/imageNotFound.png',  // within image_location
        };

        // Apply defaults from Hugo config (if this is part of Hugo)
        this.options = Object.assign({}, this.defaults);
        this.applyOptions(options);
        //this.transitionEnd = this.whichTransitionEvent();

        this.docReady(() => {
            this.enable();
        });
    }

    clampInt(val, min, max) {
        if val < min {
            return min
        }
        if val > max {
            return max
        }
        return val
    }

    // Add the user-supplied options to this.options, doing a bit of validation, convert strings to numbers, etc.
    // (Just makes values usable -- doesn't give any feedback) 
    applyOptions (options) {
        for (let key in options) {
            //console.log(key, options[key]);
            switch (key) {
                case 'fade_duration':
                    // Value in ms
                    let val = parseInt(options[key], 10);
                    if (isNaN(val)) {
                        // Leave previous/default value
                    } else {
                        // Apply reasonable limits
                        this.options[key] = this.clamp(val, 0, 100_000);
                    }
                    break;
                case 'max_width':
                case 'max_height':
                    // Need a number to use as a percentage.
                    let val = parseInt(options[key], 10);
                    if (isNaN(val)) {
                        // Leave previous/default value
                    } else {
                        this.options[key] = this.clamp(val, 10, 100);
                    }
                    break;
                case 'wrap_around':
                case 'disable_scrolling':
                    // Make it either true or false
                    if (('false'.startsWith(val.toLowerCase())) || !val) {
                        val = false
                    }
                    this.options[key] = val ? true : false
                    break;
                case 'overlay_opacity':
                case 'swipe_min':
                    // 0.0 .. 1.0
                    f = parseFloat(val)
                    if (!isNaN(f)) {     // leave as default if NaN
                        this.options[key] = f
                    }
                    break;
                default:
                    // Just copy it
                    this.options[key] = options[key];
            }
        }
    }

    docReady (fn) {
        // see if DOM is already available
        if (document.readyState === "complete" || document.readyState === "interactive") {
            // call on next available tick
            setTimeout(fn, 1);
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }

    handleKey (e) {
        const KEYCODE_ESC        = 27;
        const KEYCODE_LEFTARROW  = 37;
        const KEYCODE_RIGHTARROW = 39;
        switch (e.keyCode) {
            case KEYCODE_ESC:
                e.stopPropagation();
                //console.log("escape pressed", e.keyCode, e.code);
                this.dismantle();
                break;
            case KEYCODE_LEFTARROW:
                //console.log("<- pressed", e.keyCode, e.code);
                this.prevImage(e);
                break;
            case KEYCODE_RIGHTARROW:
                //console.log("-> pressed", e.keyCode, e.code);
                this.nextImage(e);
                break;
        }
    }
    
    /* Not needed -- use 'once' instead 
    // From https://www.freecodecamp.org/news/javascript-debounce-example/
    // const processChanges = debounce(() => saveInput());
    // TODO this is throttling rather than debouncing?
    debounce (func, timeout = 300) {
        let timer;
        return (...args) => {
            const now = Date.now();
            if (!timer) {
                console.log("debounce: running func with args:", now, func, ...args);
                func.apply(this, args);
            } else {
                console.log("debounce: not running func", now, func);
            }
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = undefined;
                console.log("debounce: timer cleared", Date.now()); 
            }, timeout);
        };
    }
    */
    /*
    // is this better?  No!
    debounce2 (fn, delay = 300) {
        let timer;
        return (...args) => {
            if (timer) {
                clearTimeout(timer);
                console.log("debounce: putting it off");
            }
            // Oh! this won't run the fn for ages...
            timer = setTimeout(fn, delay, ...args)
        }
    }
    */

    /*
    // From https://webdesign.tutsplus.com/javascript-debounce-and-throttle--cms-36783t#toc-v2qk-debounce-vs-throttle
    //initialize throttlePause variable outside throttle function
    let throttlePause;
    const throttle = (callback, time) => {
        //don't run the function if throttlePause is true
        if (throttlePause) return;
        //set throttlePause to true after the if condition. This allows the function to be run once
        throttlePause = true;
        //setTimeout runs the callback within the specified time
        setTimeout(() => {
            callback();
            //throttlePause is set to false once the function has been called, allowing the throttle function to loop
            throttlePause = false;
        }, time);
    };
    */

    /*
    simpleTouch (element, callback, ...args) {
        // TEMP no bounce  element.addEventListener('touchstart', this.debounce((estart) => {
        return;  // Oh! FIXME it works better on my screen without all this  9Sep23
        element.addEventListener('touchstart', (estart) => {
            estart.preventDefault();
            estart.stopPropagation();
            const t0 = estart.touches[0];
            const el = t0.target;
            const startX = t0.screenX;
            const startY = t0.screenY;
            el.addEventListener('touchend', (eend) => {
                const t0 = eend.changedTouches[0];
                const endX = t0.screenX;
                const endY = t0.screenY;
                console.log("lb:sT:end endX=%o startX=%o  endY=%o startY=%o", endX, startX, endY, startY); //eend=", eend);
                // TODO detect up/down scrolling -- propogate it, or something.
                if (endX == startX && endY == startY) {
                    // good touch -- fire the callback
                    if (typeof(callback) == 'function') {
                        setTimeout(() => callback(eend, ...args));
                    }
                }
            }, { once: true });
        }); //);
    }
    */

    // enable() is called via init() when page (i.e. JS) is loaded
    enable () {
        const self = this;
        // Attach click/touch/pointer listeners to every element on the page
        // that has [data-lightbox] in its attributes.
        // Need to ignore swipes at this stage.
        // (This requires that DOM is ready, but happens before the lightbox has been built.)
        const matches = document.querySelectorAll("[data-lightbox]");
        matches.forEach(function(match) {
            self.clickOrTouch(match, self.start.bind(self), match);
        });
    }

    prevImage (e) {
        e.preventDefault();
        e.stopPropagation();
        // TODO check wrap_around   and do nothing if album length is 1 (or is that already handled elsewhere?)
        //console.log("method prevImage: currentII=%d", this.currentImageIndex);
        if (this.currentImageIndex == 0) {
            this.changeImage(this.album.length - 1);
        } else {
            this.changeImage(this.currentImageIndex - 1);
        }
    }

    nextImage (e) {
        e.preventDefault();
        e.stopPropagation();
        //console.log("method nextImage: currentII=%d", this.currentImageIndex);
        if (this.currentImageIndex === this.album.length - 1) {
            this.changeImage(0);
        } else {
            this.changeImage(this.currentImageIndex + 1);
        }
    }

    // Honour a click on the current lightbox image (either 1 or 2).
    // If the image has no URL, it's clickability will have been turned off, but we'll check anyway.
    // If via swipe, e is null.
    clickThroughImage (e) {
        e.preventDefault();
        e.stopPropagation();
        // this.currentImageIndex is evaluated at click time, so gives the correct URL.
        const targetUrl = this.album[this.currentImageIndex].url;
        //console.log("method cTI: currentII=%d  targetUrl='%s'", this.currentImageIndex, targetUrl);
        if (targetUrl) {
            // using window.open always seems to be blocked as a pop-up, so don't bother
            /*
                if (isExternalLink(targetUrl)) {
                    window.open(targetUrl, "_blank"); //, "noopener");
                } else {
                */
            window.location = targetUrl;
            /* } */
        /*
        } else if (this.albumLen == 1) {
            // Nowhere to go, so close the lightbox
            // FIXME or maybe don't -- try ignoring the click
            console.log("lb:cTI: NOT dismantling when nowhere to go");
            //this.dismantle();
        */
        }
    }

    // Attach click or debounced touch events to an element, with a callback.
    // (If there's no callback, we still may prevent the click/touch from propagating.)
    // Callback gets passed the event and any other arsgs.
    clickOrTouch (element, callback, ...args) {
        // TEMP no debounce element.addEventListener('click', this.debounce(() => callback(args)));
        //console.log("lb:cOT, element=%o callback=%o", element, callback);
        element.addEventListener('click', (e) => { callback(e, ...args); });
        // NOT NEEDED!  this.simpleTouch(element, callback, args);
    }
        
    // FIXME does this handle being attached to more than one element ?!"!?
    // From http://www.javascriptkit.com/javatutors/touchevents2.shtml
    // Detect left/right swipe or simple touch on gallery pictures.
    // Goes to previous, next, clickthrough or nowhere.
    clickTouchOrSwipe (element, clickCallback, leftCallback, rightCallback) {
        const self = this;
        //console.log("cTOS surface=", element);

        // Simple click
        element.addEventListener('click', (eclick) => { 
            eclick.preventDefault();
            eclick.stopPropagation();
            //console.log("cTOS: simple click");
            clickCallback(eclick); 
        });

        // Touches -- simple or swipe left/right
        //element.addEventListener('touchstart', function(estart) {
        element.addEventListener('touchstart', function(estart) {
            estart.preventDefault();
            estart.stopPropagation();
            const touch = estart.changedTouches[0];
            let swipedir = '';
            const startX = touch.pageX;
            const startY = touch.pageY;
            //console.log("cTOS: touchstart %o at %d,%d", Date.now(), startX, startY);
            //let startTime = new Date().getTime(); // record time when finger first makes contact with surface
            element.addEventListener('touchend', function(eend) {
                eend.preventDefault();
                const touch = eend.changedTouches[0];
                const distX = touch.pageX - startX; // get horizontal dist traveled by finger while in contact with surface
                const distY = touch.pageY - startY; // get vertical dist traveled by finger while in contact with surface
                //const endTime = new Date().getTime();
                //const elapsedTime = endTime - startTime;
                //console.log("cTOS: touchend %o at %d,%d", Date.now(), distX, distY);
                // Detect left/right or up/down swipe.  Check for l/r first -- diagonals will be detected as l/r rather than u/d.
                if (Math.abs(distX) >= self.options.swipe_min * window.innerWidth) { 
                    swipedir = (distX < 0) ? 'l' : 'r';
                    //console.log("cTOS: distX=%o distY=%O swipedir=%s", distX, distY, swipedir);
                } else if (Math.abs(distY) >= self.options.swipe_min * window.innerHeight) {
                    swipedir = (distY < 0) ? 'u' : 'd';
                    //console.log("cTOS: distX=%o distY=%O swipedir=%s", distX, distY, swipedir);
                } else {
                    // Very short swipe -- call it a touch
                    //console.log("cTOS: short distance (%d,%d) -- none", distX, distY);
                    swipedir = 't';
                }
                switch (swipedir) {
                    case 't':   // touch
                        if (typeof(clickCallback) == 'function') {
                            clickCallback(eend);
                        }
                        break;
                    case 'r':   // left or down: previous image
                    case 'd':
                        if (typeof(leftCallback) == 'function') {
                            leftCallback(eend);
                        }
                        break;
                    case 'l':   // right or up: next image
                    case 'u':
                        if (typeof(rightCallback) == 'function') {
                            rightCallback(eend);
                        }
                        break;
                    default:
                        // do nothing
                }
            }, { once: true }); // only want touchend once per touchstart.
        });

        element.addEventListener('touchmove', function(emove) {
            emove.preventDefault(); // prevent scrolling when inside DIV   What?
        });
    }

    // Build html for the lightbox and the overlay.
    // Attach event handlers to the new DOM elements.
    // NOTE This happens as part of start(), after user has clicked an image.
    build () {
        //console.log("BBBBBBBBBBBBBuild");

        if (this.options.disable_scrolling) {
            this.oldBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }

        // FIXME are -overlay and -nav both needed? -- overlay traps clicks
        const html = `
            <div id=lb-overlay class=lb-element>
            <div id=lb-nav class="lb-element lb-navclass">
                <div id=lb-prev aria-label="Previous image" class=lb-element></div>
                <div id=lb-next aria-label="Next image" class=lb-element></div>
            </div>
            <div id=lb-flex1 class="lb-flex lb-element">
                <figure id=lb-figure1 class="lb-element lb-figure">
                    <div id=lb-image1-prev class="lb-element lb-navclass"></div>
                    <div id=lb-image1-next class="lb-element lb-navclass"></div>
                    <img id=lb-image1 class=lb-element src="../images/spinner.gif">
                    <figcaption id=lb-figcap1 class=lb-element></figcaption>
                </figure>
            </div>
            <div id=lb-flex2 class="lb-flex lb-element">
                <figure id=lb-figure2 class="lb-element lb-figure">
                    <div id=lb-image2-prev class="lb-element lb-navclass"></div>
                    <div id=lb-image2-next class="lb-element lb-navclass"></div>
                    <img id=lb-image2 class=lb-element src="../images/spinner.gif">
                    <figcaption id=lb-figcap2 class=lb-element></figcaption>
                </figure>
            </div></div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        // Swappable units
        this.unit1 = {
            id:        1,
            flex:      document.getElementById('lb-flex1'),
            figure:    document.getElementById('lb-figure1'),
            imagePrev: document.getElementById('lb-image1-prev'),
            imageNext: document.getElementById('lb-image1-next'),
            image:     document.getElementById('lb-image1'),
            figcap:    document.getElementById('lb-figcap1'),
        };
        this.unit2 = {
            id:        2,
            flex:      document.getElementById('lb-flex2'),
            figure:    document.getElementById('lb-figure2'),
            imagePrev: document.getElementById('lb-image2-prev'),
            imageNext: document.getElementById('lb-image2-next'),
            image:     document.getElementById('lb-image2'),
            figcap:    document.getElementById('lb-figcap2'),
        };

        // Cache DOM objects
        this.overlay    = document.getElementById('lb-overlay');
        this.nav        = document.getElementById('lb-nav');
        this.prev       = document.getElementById('lb-prev');
        this.next       = document.getElementById('lb-next');
        this.lbelements = document.getElementsByClassName('lb-element');
        this.lbnavelements = document.getElementsByClassName('lb-navclass');

        // Override CSS depending on options
        /* in onload stuff
        this.unit1.image.style.maxWidth = "" + this.options.max_width + "vw";
        this.unit2.image.style.maxWidth = "" + this.options.max_width + "vw";
        this.unit1.image.style.maxHeight = "" + this.options.max_height + "vh";
        this.unit2.image.style.maxHeight = "" + this.options.max_height + "vh";
        */ 
        // Attach event handlers
        const self = this;
        // Close lightbox if clicked/touched other than on navigation areas:
        this.clickOrTouch(this.overlay, this.dismantle.bind(this));

        // Intercept key presses (looking for 'escape' or left/right arrows)
        document.addEventListener('keydown', this.handleKey.bind(this), false);

        this.clickOrTouch(this.prev,            this.prevImage.bind(this));
        this.clickOrTouch(this.unit1.imagePrev, this.prevImage.bind(this));
        this.clickOrTouch(this.unit2.imagePrev, this.prevImage.bind(this));
        this.clickOrTouch(this.next,            this.nextImage.bind(this));
        this.clickOrTouch(this.unit1.imageNext, this.nextImage.bind(this));
        this.clickOrTouch(this.unit2.imageNext, this.nextImage.bind(this));

        // from https://www.designcise.com/web/tutorial/how-to-check-if-a-string-url-refers-to-an-external-link-using-javascript
        function isExternalLink (url) {
            const tmp = document.createElement('a');
            tmp.href = url;
            return tmp.host !== window.location.host;
        }

        // Images get clicked/touched where not covered by navigation divs
        this.clickTouchOrSwipe(this.unit1.figure, this.clickThroughImage.bind(this), this.prevImage.bind(this), this.nextImage.bind(this));
        this.clickTouchOrSwipe(this.unit2.figure, this.clickThroughImage.bind(this), this.prevImage.bind(this), this.nextImage.bind(this));

    }; // end of build()

    // TEMP fadeTo that just does it now
    /*
    fadeToZero (element, duration, opacity, completeFn = null) {
        if (opacity != 0) {
            element.style.display = ""; // revert to non-inline value
        }
        element.style.opacity = opacity;
        if (opacity == 0) {
            element.style.display = "none";
        }
        if (completeFn) {
            completeFn();
        }
    }
    */

    fadeTo (element, duration, opacity, completeFn = null) {
        //console.log("lb:fadeTo element=%s  duration=%o  opacity=%o  fn=%o", element.id, duration, opacity, completeFn);
        // Still can't get transitionend stuff to work reliably, so we'll just do timeout stuff
        element.style['transition-property'] = 'opacity';
        element.style['transition-duration'] = this.options.fade_duration + 'ms';
        if (opacity != 0) {
            // Make sure it's displayed if the target opacity is non-zero
            element.style.display = ""; // revert to non-inline value
        }
        // Start the opacity transition after CSS changes
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.style.opacity = opacity;
            });
        });
        setTimeout(() => {
            //console.log("fadeTo timed out to fade_duration");
            if (opacity == 0) {
                element.style.display = "none";
            }
            if (typeof completeFn == "function") {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        completeFn();
                    });
                });
            }

        }, this.options.fade_duration);
    }

    // User has clicked on an element with 'data-lightbox'.
    // Show lightbox. If the image is part of a set, add others in set to album array.
    start (e, lbelement) {
        // Spread args not working?  -- make sure lbelement isn't an array:
        if (Array.isArray(lbelement)) {
            lbelement = lbelement[0];
        }
        // lbelement is the thing clicked on -- typically a <figure> or <image>
        //console.log("SSSSSSSSSSSSSSStart lbelement=", lbelement);
        if (!lbelement) {
            return; // shouldn't happen
        }

        // Apply user-supplied options 
        if (typeof lightboxssa_options == "object") {
            //console.log("lbSSA.start: options are %o", lightboxssa_options);
            this.applyOptions(lightboxssa_options);
        }

        // Build <<<<<<<<<<<<<<<
        this.build();

        this.showLightbox();

        this.album = [];
        let imageNumber = 0;

        const self = this;
        function addToAlbum (lbe) {
            const tag = lbe.tagName;
            const parent = lbe.parentElement;
            let img = null;
            let figcaption = null;
            switch (tag) {
            case "IMG":
                img = lbe;
                break;
            case "FIGURE":
                img = lbe.querySelector('img');
                figcaption = lbe.querySelector('figcaption');
                break;
            }
            // Image can be from: -- searched in this order
            // - data-image
            // - <img>'s src
            // - <figure>'s (first) <img>'s src
            //var imageURL = $lbelement.attr('data-image');
            let imageURL = lbe.getAttribute('data-image');  // returns null or "" if not there
            if (!imageURL) {
                switch (tag) {
                case "IMG":
                    imageURL = lbe.getAttribute('src');
                        break;
                case 'FIGURE':
                    if (img) {
                        imageURL = img.getAttribute('src');
                    }
                    break;
                }
            }
            if (!imageURL) {
                imageURL = self.options.placeholder_image;
            }
            //console.log("imageURL: ", imageURL);
            // Link URL is from data-url or <fig>'s <img>'s data-url or <a>'s href
            // - <a>'s href - how to check if that is an image?
            let linkURL = lbe.getAttribute('data-url');
            if (!linkURL) {
                switch (tag) {
                case 'FIGURE':
                    if (img) {
                        linkURL = img.getAttribute('data-url');
                    }
                    break;
                case 'A':
                    linkURL = lbe.getAttribute('href');
                    break;
                }
            }
            // Title -- from data-title or img's title
            let title = lbe.getAttribute('data-title');
            if (!title) {
                if (img) {
                    title = img.getAttribute('title');
                }
            }
            // Alt -- from data-alt or img's alt
            let alt = lbe.getAttribute('data-alt');
            if (!alt) {
                if (img) {
                    alt = img.getAttribute('alt');
                }
            }
            // Caption -- from data-caption or figcaption
            let caption = lbe.getAttribute('data-caption');
            if (!caption) {
                if (figcaption) {
                    caption = figcaption.textContent;
                }
            }
            // srcset -- from data-srcset or img
            let srcsetString, srcset;
            srcsetString = lbe.getAttribute('data-srcset');
            if (!srcsetString) {
                if (img) {
                    srcsetString = img.getAttribute('srcset');
                }
            }
            // aspect ratio -- from data-aspect
            let aspect = lbe.getAttribute('data-aspect');
            if (aspect) {
                aspect = parseFloat(aspect);
            }
            if (!aspect || isNaN(aspect)) {
                aspect = 1.0; // arbitrary default
            }
            //console.log("lbSSA adding image: imageURL=%s linkURL=%s title=%s alt=%s caption=%s srcset=%o aspect=%f", imageURL, linkURL, title, alt, caption, srcsetString, aspect);
            self.album.push({
                name:         imageURL,
                url:          linkURL,
                title:        title,
                alt:          alt,
                caption:      caption,
                srcsetString: srcsetString,
                aspect:       aspect,
            });
        } // end of addToAlbum

        const dataLightboxValue = lbelement.getAttribute('data-lightbox');
        // Find all elements with the same gallery name.  querySelectorAll returns them in document order.
        const lbelements = document.querySelectorAll('[data-lightbox="' + dataLightboxValue + '"]');
        if (lbelements) {
            let i = 0;
            lbelements.forEach(function(lbe) {
                addToAlbum(lbe);
                if (lbe === lbelement) {
                    imageNumber = i;
                }
                i += 1;
            });
        } else {
            // Don't know why this happens sometimes.  Timing?
            //console.log("lb: no lightbox elements! dlB=%s", dataLightboxValue);
            // At least put the original element in the album
            addToAlbum(lbelement);
            imageNumber = 0;
        }
        //console.log("imageNumber=%d  album: ", imageNumber, this.album);

        this.albumLen = this.album.length;
        if (this.albumLen == 1) {
            // nowhere to navigate to
            for (const nav of this.lbnavelements) {
                nav.style.display = "none";
            }
            // (clickThroughImage will handle clicks)
        }
        if (this.albumLen == 2 && !this.options.wrap_around) {
            // TODO adjust arrows by hiding prev or next
        }

        // Set pointers for swapping (they'll be swapped immediately in changeImage())
        this.currentUnit = this.unit2;
        this.otherUnit   = this.unit1;
        this.changeImage(imageNumber);
    }; // end of start()

    // TODO need to know which way we're going to optimise loading of prev and next ?  FOR NOW rely on browser's cacheing, and just get prev and next the simple way
    // FIXME currently not doing any preloading -- conflicts with srcset stuff, I think.
    // (depends on length of album)
    // Load the specified image as this.otherUnit.image, adjust its size, then call showImage() to swap images
    changeImage (imageNumber) {
        if (this.album.len == 0) {
            //console.log("lb:changeImage: album is empty");
            return;
        }
        const self = this;
        // The DOM figure/image/figcap we're about to modify:
        const figure = this.otherUnit.figure;
        const image = this.otherUnit.image;
        const figcap = this.otherUnit.figcap;
        // The album entry we're going to load:
        const albumEntry = this.album[imageNumber];
        if (!albumEntry) {
            //console.log("lb:cI: albumEntry not set");
            return;
        }

        function onLoad (e) {
            // Get the dimensions of the image that the srcset mechanism has chosen:
            const targetImage = image;  //e.currentTarget;  // see https://stackoverflow.com/questions/68194927/
            //console.log("onLoad: currentSrc=%s  i.width=%d  i.naturalWidth=%d", targetImage.currentSrc, targetImage.width, targetImage.naturalWidth);

            // Rely on srcset urls ending in ?w=800 or whatever the actual image's pixel width is
            // See this: https://stackoverflow.com/questions/67249881/img-naturalwidth-unexpected-return-value
            if (targetImage.srcset) {
                let pixelWidth = targetImage.naturalWidth;  // use this if src (rather than srcset) image was used.
                const wpos = targetImage.currentSrc.indexOf("?w=");
                if (wpos > -1) {
                    pixelWidth = parseInt(targetImage.currentSrc.substr(wpos+3));
                }
                if (!isNaN(pixelWidth)) {
                    targetImage.style.maxWidth = `${pixelWidth}px`;
                }
            }
            self.showImage();
        }; // end of onload function

        function onError () {
            // Expected image not found -- use placeholder
            // (This seems to work.  If the placeholder isn't found,
            // we just end up with a border round nothing.)
            this.src = self.options.placeholder_image;
        }

        image.addEventListener('load', onLoad, { once: true });
        image.addEventListener('error', onError, { once: true });

        // Load the new image -- it will have opacity 0 at first
        // (this fires the onLoad function above) 
        image.src = albumEntry.name;
        image.srcset =  albumEntry.srcsetString || "";
        image.sizes = "" + this.options.max_width + "vw";
        image.alt = albumEntry.alt || "";
        image.title = albumEntry.title || "";
        image.style.cursor = (albumEntry.url ? "pointer" : "auto");
        figcap.innerHTML = albumEntry.caption || "";

        this.currentImageIndex = imageNumber;

    }; // end of changeImage()

    // Make the lightbox stuff visible
    showLightbox () {
        this.fadeTo(this.overlay, this.options.fade_duration, this.options.overlay_opacity, ()=>{
            //console.log("overlay fadeIn complete");
        });
    }

    // Display the image and its details and begin preloading neighbouring images.
    // Fades out the current image, fades in the other one, then swaps the pointers.
    showImage () {  // (width, height) 
        //console.log("showImage swapping from %s to %s", this.currentUnit.id, this.otherUnit.id);
        this.currentUnit.imagePrev.style['pointer-events'] = 'none';
        this.currentUnit.imageNext.style['pointer-events'] = 'none';
        // TODO? don't bother to fade if already at the target opacity
        this.fadeTo(this.currentUnit.flex, this.options.fade_duration, 0.0, (e) => {
            //requestAnimationFrame(() =>{console.log("fade out current finished");});
            //console.log("fade out current finished  e=", e);
        });
        this.fadeTo(this.otherUnit.flex, this.options.fade_duration+10, 1.0, (e) => {    // function() {
            //console.log("fade in other finished  e=", e);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    //console.log("fade in other timeout called");
                    // Swap the images
                    [this.otherUnit, this.currentUnit] = [this.currentUnit, this.otherUnit];
                    this.currentUnit.imagePrev.style['pointer-events'] = 'auto';
                    this.currentUnit.imageNext.style['pointer-events'] = 'auto';
                });
            });
        });
    }

    // Preload previous and next images in set.
    // TODO (if we're doing this at all) -- set srcset and sizes as in changeImage()
    preloadNeighboringImages () {
        if (this.album.length > this.currentImageIndex + 1) {
            var preloadNext = new Image();
            preloadNext.src = this.album[this.currentImageIndex + 1].name;
        }
        if (this.currentImageIndex > 0) {
            var preloadPrev = new Image();
            preloadPrev.src = this.album[this.currentImageIndex - 1].name;
        }
    };

    // Unbuild the DOM structure
    dismantle (e) {
        // Fading before removing would be nice, but it leaves bits behind,
        // and e.g. clickThrough event still happens.
        //console.log("DDDDDDDDDDDDDDDDDDDDDDDismantling");
        this.fadeTo(this.overlay, this.options.fade_duration, 0, () => {
            setTimeout(() => {
                this.overlay.replaceChildren();
                this.overlay.remove();
            });
        });
        if (this.options.disable_scrolling) {
            document.body.style.overflow = this.oldBodyOverflow;
        }
        document.removeEventListener('keydown', this.handleKey);
    };

} // end of class LightboxSSA

// Create an (the only) instance of our Class.
// Can set options here.
const lbSSA = new LightboxSSA({});

