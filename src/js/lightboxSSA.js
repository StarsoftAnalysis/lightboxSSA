// lightboxSSA.js

// version 0.5.0 6/12/2023

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

// data- attributes   -- get them from the img or figure etc.
// - data-lightbox="galleryname"
// - data-srcset
// - data-title="image title"
// - data-alt="alt info"
// - data-url="http... "   - link when lightboxed image is clicked - optional - if present, we wrap the <img> with a <a>.  or the <figure>?

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
            overlay_colour: "gray", // any CSS colour string
            max_width: 95,  // %
            max_height: 95,
            wrap_around: true,
            disable_scrolling: false, // hide scrollbar so that lightbox uses full area of window
            swipe_min: 0.1,  // minimum swipe distance (as fraction screen size) 
            placeholder_image: '/images/lightboxSSA/imageNotFound.png',  // within image_location
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
        if (val < min) {
            return min
        }
        if (val > max) {
            return max
        }
        return val
    }

    // Add the user-supplied options to this.options, doing a bit of validation, convert strings to numbers, etc.
    // (Just makes values usable -- doesn't give any feedback) 
    applyOptions (options) {
        for (let key in options) {
            //console.log(key, options[key]);
            let val
            switch (key) {
                case 'fade_duration':
                    // Value in ms
                    val = parseInt(options[key], 10);
                    if (isNaN(val)) {
                        // Leave previous/default value
                    } else {
                        // Apply reasonable limits
                        this.options[key] = this.clampInt(val, 0, 100_000);
                    }
                    break;
                case 'max_width':
                case 'max_height':
                    // Need a number to use as a percentage.
                    val = parseInt(options[key], 10);
                    if (isNaN(val)) {
                        // Leave previous/default value
                    } else {
                        this.options[key] = this.clampInt(val, 10, 100);
                    }
                    break;
                case 'wrap_around':
                case 'disable_scrolling':
                    // Make sure it's either true or false
                    val = options[key];
                    if (typeof(val) == 'boolean') {
                        // already boolean
                    } else if (typeof(val) == 'string') {
                        // it's a string
                        val = 'false'.startsWith(val.toLowerCase());
                    } else {
                        // make it boolean
                        val = val ? true : false;
                    }
                    this.options[key] = val;
                    break;
                case 'overlay_opacity':
                case 'swipe_min':
                    // 0.0 .. 1.0
                    val = parseFloat(options[key]);
                    if (!isNaN(val)) {     // leave as default if NaN
                        this.options[key] = val
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
        // that has data-lightbox=... in its attributes or class='lightbox'.
        // Need to ignore swipes at this stage.
        // (This requires that DOM is ready, but happens before the lightbox has been built.)
        const matches = document.querySelectorAll("[data-lightbox], [class*='lightbox' i]" );  // need 'contains' because classes are returned as a string
        matches.forEach(function(match) {
            self.clickOrTouch(match, self.start.bind(self), match);
        });
    }

    prevImage (e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.currentImageIndex == 0) {
            if (this.options.wrap_around) {
                this.changeImage(this.album.length - 1);
            } else {
                this.dismantle();
            }
        } else {
            this.changeImage(this.currentImageIndex - 1);
        }
    }

    nextImage (e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.currentImageIndex == this.album.length - 1) {
            if (this.options.wrap_around) {
                this.changeImage(0);
            } else {
                this.dismantle();
            }
        } else {
            this.changeImage(this.currentImageIndex + 1);
        }
    }

    // from https://www.designcise.com/web/tutorial/how-to-check-if-a-string-url-refers-to-an-external-link-using-javascript
    /*
    isExternalLink (url) {
        const tmp = document.createElement('a');
        tmp.href = url;
        return tmp.host !== window.location.host;
    }
    */

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
                if (this.isExternalLink(targetUrl)) {
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

        const html = `
            <div id=lb-overlay class=lb-element>
            <div id=lb-nav class="lb-element lb-navclass">
                <div id=lb-prev aria-label="Previous image" class="lb-prev-ptr lb-element"></div>
                <div id=lb-next aria-label="Next image" class="lb-next-ptr lb-element"></div>
            </div>
            <div id=lb-flex1 class="lb-flex lb-element">
                <figure id=lb-figure1 class="lb-element lb-figure">
                    <div id=lb-image1-prev class="lb-element lb-navclass lb-prev-ptr"></div>
                    <div id=lb-image1-next class="lb-element lb-navclass lb-next-ptr"></div>
                    <img id=lb-image1 class=lb-element src="/images/lightboxSSA/spinnerSSA.gif">
                    <figcaption id=lb-figcap1 class=lb-element></figcaption>
                </figure>
            </div>
            <div id=lb-flex2 class="lb-flex lb-element">
                <figure id=lb-figure2 class="lb-element lb-figure">
                    <div id=lb-image2-prev class="lb-element lb-navclass lb-prev-ptr"></div>
                    <div id=lb-image2-next class="lb-element lb-navclass lb-next-ptr"></div>
                    <img id=lb-image2 class=lb-element src="/images/lightboxSSA/spinnerSSA.gif">
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

        // Images get clicked/touched where not covered by navigation divs
        this.clickTouchOrSwipe(this.unit1.figure, this.clickThroughImage.bind(this), this.prevImage.bind(this), this.nextImage.bind(this));
        this.clickTouchOrSwipe(this.unit2.figure, this.clickThroughImage.bind(this), this.prevImage.bind(this), this.nextImage.bind(this));

        // Set the overlay colour
        let overlay = document.getElementById("lb-overlay");
        if (overlay) {
            overlay.style.backgroundColor = this.options.overlay_colour;
        }

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

    // User has clicked on an element with 'data-lightbox' or 'class=lightbox...'.
    // Show lightbox. If the image is part of a set, add others in set to album array.
    start (e, lbelement) {
        // Spread args not working?  -- make sure lbelement isn't an array:
        if (Array.isArray(lbelement)) {
            lbelement = lbelement[0];
        }
        // lbelement is the thing clicked on -- typically a <figure> or <image>
        if (!lbelement) {
            return; // shouldn't happen
        }

        // Apply user-supplied options 
        if (typeof lightboxssa_options == "object") {
            //console.log("lbSSA.start: options are %o", lightboxssa_options);
            this.applyOptions(lightboxssa_options);
        }

        this.build();

        this.showLightbox();

        this.album = [];
        let imageNumber = 0;

        const self = this;
        function addToAlbum (lbe) {
            // Find details from the figure and/or the img:
            // img overrides figure; data-... details override others
            //const parent = lbe.parentElement;  not used
            let figure = null;
            let img = null;
            let figcaption = null;
            const tag = lbe.tagName;
            switch (tag) {
                case "IMG":
                    img = lbe;
                    // (DON'T look for a parent figure!)
                    break;
                case "FIGURE":
                    figure = lbe;
                    img = lbe.querySelector('img'); // first img -- we don't expect more
                    figcaption = lbe.querySelector('figcaption');
                    break;
            }
            // Image -- from img's data-image or figure's data-image, or img's src, or use placeholder
            let imageName = "";
            if (img) {
                imageName = img.getAttribute('data-image');  // returns null or "" if not there
            }
            if (!imageName && figure) {
                imageName = figure.getAttribute('data-image');
            }
            if (!imageName && img) {
                imageName = img.src;
            }
            if (!imageName) {
                imageName = self.options.placeholder_image;
            }
            // Link URL -- from img's data-url or figure's data-url 
            let linkURL = ""
            if (img) {
                linkURL = img.getAttribute('data-url');
            }
            if (!linkURL && figure) {
                linkURL = img.getAttribute('data-url');
            }
            // Title -- from img's data-title or figure's data-title or img's title
            let title = "";
            if (img) {
                title = img.getAttribute('data-title');
            }
            if (!title && figure) {
                title = figure.getAttribute('data-title');
            }
            if (!title && img) {
                title = img.getAttribute('title');
            }
            // Alt -- from img's data-alt or figure's data-alt or img's alt
            let alt = "";
            if (img) {
                alt = img.getAttribute('data-alt');
            }
            if (!alt && figure) {
                alt = figure.getAttribute('data-alt');
            }
            if (!alt && img) {
                alt = img.getAttribute('alt');
            }
            // Caption -- from img's data-caption or figure's data-caption or figcaption
            let caption = ""
            if (img) {
                caption = img.getAttribute('data-caption');
            }
            if (!caption && figure) {
                caption = figure.getAttribute('data-caption');
            }
            if (!caption && figcaption) {
                caption = figcaption.textContent;
            }
            // srcset -- from img's data-srcset or figure's data-srcset or img's srcset
            let srcset = '';
            if (img) {
                srcset = img.getAttribute('data-srcset');
            }
            if (!srcset && figure) {
                srcset = figure.getAttribute('data-srcset');
            }
            if (!srcset && img) {
                srcset = img.getAttribute('srcset');
            }
            /* NOT USED
            // aspect ratio -- from img's data-aspect or figure's data-aspect
            let aspect = 1.0;
            if (img) {
                aspect = parseFloat(img.getAttribute('data-aspect'));
            }
            if (!aspect && figure) {
                aspect = parseFloat(figure.getAttribute('data-aspect'));
            }
            if (!aspect) {
                aspect = 1.0; // arbitrary default
            }
            */
            //console.log("lbSSA adding image: imageName=%s linkURL=%s title=%s alt=%s caption=%s srcset=%o aspect=%f", imageName, linkURL, title, alt, caption, srcset, aspect);
            self.album.push({
                name:    imageName,
                url:     linkURL,
                title:   title,
                alt:     alt,
                caption: caption,
                srcset:  srcset,
                //aspect:  aspect,
            });
        } // end of addToAlbum

        // Find other elements with the same gallery name -- either from data-lightbox or class=lightbox...
        // Find all elements with the same gallery name.  querySelectorAll returns them in document order.
        // NOTE that there may legitimately be no attribute, in which case we don't want a gallery.
        let lbelements = [];
        let galleryName = lbelement.getAttribute('data-lightbox');
        if (galleryName === "") {
            // No attribute, so no gallery.  Just the single image
        } else if (galleryName === null) {
            // no data-lightbox so look for class (if more than one, we'll end up with the last one)
            const classes = lbelement.classList;
            classes.forEach(function (value, key, listObj) {
                if (value.startsWith("lightbox")) {
                    if (value.startsWith("lightbox-")) {
                        // Strip off the prefix
                        galleryName = value.replace("lightbox-", "");
                    } else {
                        // simple 'lightbox' class -- no gallery
                    }
                }
            });
        }
        if (galleryName) {
            // Collect all the elements with either data-lightbox... or class=lightbox...
            lbelements = document.querySelectorAll(`[data-lightbox='${galleryName}' i], [class='lightbox-${galleryName}' i]`);
            /*
            // TODO sort them in DOM order -- can't see how.
            let lbarray = Array.from(lbelements);
            lbarray.sort(function(a,b) {
                //var aCat = a.getElementsByTagName("category")[0].childNodes[0].nodeValue;
                //var bCat = b.getElementsByTagName("category")[0].childNodes[0].nodeValue;
                //if (aCat > bCat) return 1;
                //if (aCat < bCat) return -1;
                return 0;
            });
            */
        } else { 
            // Just one image in the lightbox
            lbelements = [lbelement];
        }
        if (lbelements.length > 0) {
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
            console.log("lb: no lightbox elements!  lbelement=%o  dlB=%s", lbelement, galleryName);
            // At least put the original element in the album
            addToAlbum(lbelement);
            imageNumber = 0;
        }
        //console.log("imageNumber=%d  album: ", imageNumber, this.album);
        
        /*
        // If data-url is present, wrap the element in <a>...</a>
        // NO!  The click will happen within the lightbox
        so it's not the lbelement that needs wrapping -- we just look for clicks!!!
        let url = lbelement.getAttribute('data-url);
        if (url) {
        }
        */
        /* Pictures have click-through if... */

        this.albumLen = this.album.length;
        if (this.albumLen == 1) {
            // nowhere to navigate to
            for (const nav of this.lbnavelements) {
                nav.style.display = "none";
            }
            // (clickThroughImage will handle clicks)
        }
        /* NO not here
        if (this.albumLen > 1 && !this.options.wrap_around) {
            // TODO adjust arrows by hiding prev or next
        }
        */

        // Set pointers for swapping (they'll be swapped immediately in changeImage())
        this.currentUnit = this.unit2;
        this.otherUnit   = this.unit1;
        this.changeImage(imageNumber);
    }; // end of start()

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
            self.showImage();
        }

        function onError () {
            // Expected image not found -- use placeholder
            // (If the placeholder isn't found,
            // we just end up with a border round nothing.)
            this.src = self.options.placeholder_image;
        }

        image.addEventListener('load', onLoad, { once: true });
        image.addEventListener('error', onError, { once: true });

        // Load the new image -- it will have opacity 0 at first
        // (this fires the onLoad function above) 
        image.src = albumEntry.name;
        image.srcset =  albumEntry.srcset || "";
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
        this.currentUnit.imagePrev.title = "";
        this.currentUnit.imageNext.title = "";
        // TODO? don't bother to fade if already at the target opacity
        this.fadeTo(this.currentUnit.flex, this.options.fade_duration, 0.0, (e) => {
            //requestAnimationFrame(() =>{console.log("fade out current finished");});
            //console.log("fade out current finished  e=", e);
        });
        this.fadeTo(this.otherUnit.flex, this.options.fade_duration+10, 1.0, (e) => {    // function() {
            //console.log("fade in other finished  e=", e);
            // FIXME why two layers of rAF ?
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    //console.log("fade in other timeout called");
                    // Swap the images
                    [this.otherUnit, this.currentUnit] = [this.currentUnit, this.otherUnit];
                    this.currentUnit.imagePrev.style['pointer-events'] = 'auto';
                    this.currentUnit.imageNext.style['pointer-events'] = 'auto';
                    this.currentUnit.imagePrev.title = this.currentUnit.image.title;
                    this.currentUnit.imageNext.title = this.currentUnit.image.title;
                    // if first/last and not wrapping, take out #lb-next id
                    // TODO use classes for prev/next cursors
                    if (this.currentImageIndex == 0 && !this.options.wrap_around) { 
                        this.prev.classList.remove("lb-prev-ptr");
                        this.currentUnit.imagePrev.classList.remove('lb-prev-ptr');
                    } else {
                        this.prev.classList.add("lb-prev-ptr");
                        this.currentUnit.imagePrev.classList.add('lb-prev-ptr');
                    }
                    if (this.currentImageIndex == this.albumLen-1 && !this.options.wrap_around) { 
                        this.next.classList.remove("lb-next-ptr");
                        this.currentUnit.imageNext.classList.remove('lb-next-ptr');
                    } else {
                        this.next.classList.add("lb-next-ptr");
                        this.currentUnit.imageNext.classList.add('lb-next-ptr');
                    }
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
    dismantle () {
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

