// LightboxSSA 

// version 2.53 21/11/2022

// Copyright 2020-2022 Chris Dennis

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
// - every swipe makes it smaller!
// - fadeToProper -- is that the problem
// - need to debounce? -- ? with fade_duration 
// - cSOT on image and imagePrev/Next instead of figure?

// TRY THIS
//   this.srcset = albumEntry.srcset
//   and likewise for sizes and src
//  then in on-load: console.log(this.currentSrc) to see if it worked
//  and then get rid of srcset parser!!

// TODO
// - touch on image goes through to overlay (wrong); click does it correctly
        // simpleTouch gets called as well as CTOS
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
// 

// (for figset): need to limit image to natural size AND max_width/height lbSSA config values -- so implement the latter as margin/padding instead of percentage, then we can do max-width=<size>px etc.
// - which bits of pointer-event tweaking are needed?
// -  fadeTo doesn't seem to work slowley if we set display:none at the end
//    -- improving, but a lot of overlap between several transitions and timeouts, so results are inconsistent

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
        console.log("CCCCCCCCCCCCCCCCConstructor options=", options);
        this.album = [];
        this.currentImageIndex = 0;
        // NOTE: these have to be lowercase or snake_case because of the way they can be
        // set e.g. via Hugo params
        this.defaults = {
            //album_label: 'Image %1 of %2',
            //show_image_number_label: false,    // TODO not reimplemented
            //always_show_nav_on_touch_devices: false,
            fade_duration: 600,
            overlay_opacity: 1.0,   
            //max_size: 50000,
            max_width: 90,  // %
            max_height: 90,
            //resizeDuration: 700,
            wrap_around: true,
            disable_scrolling: false, // hide scrollbar so that lightbox uses full area of window
            // Sanitize Title
            // If the caption data is trusted, for example you are hardcoding it in, then leave this to false.
            // This will free you to add html tags, such as links, in the caption.
            // If the caption data is user submitted or from some other untrusted source, then set this to true
            // to prevent xss and other injection attacks.
            // FIXME implement this
            sanitize_title: false,
            //min_nav_width: this.constants.arrowWidth, // Space for arrow *outside* the image area.  Arrow images are 31px wide.
            placeholder_image: '/images/imageNotFoundSSA.png',
            swipethreshold: 100,  // required min distance traveled to be considered swipe
            swiperestraint: 70,   // maximum distance allowed at the same time in perpendicular direction
            // FIXME do we need a maximum time? (if so, make it smaller) (if not get rid of some code)
            swipeallowedtime: 40000, // maximum time allowed to travel that distance
        };
        this.options = Object.assign({}, this.defaults);
        this.applyOptions(options);
        //this.transitionEnd = this.whichTransitionEvent();

        this.docReady(() => {
            this.enable();
        });
    }

    // Add the user-supplied options to this.options, doing a bit of validation, convert strings to numbers, etc.
    // (Just makes values usable -- doesn't give any feedback) 
    applyOptions (options) {
        for (let key in options) {
            //console.log(key, options[key]);
            switch (key) {
                case 'max_width':
                case 'max_height':
                    // Need a number to use as a percentage.
                    let val = parseInt(options[key], 10);
                    if (isNaN(val)) {
                        // Leave previous/default value
                    } else {
                        if (val < 10) {
                            val = 10;
                        } else if (val > 100) {
                            val = 100;
                        }
                        this.options[key] = val;
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
                console.log("escape pressed", e.keyCode, e.code);
                this.dismantle();
                break;
            case KEYCODE_LEFTARROW:
                console.log("<- pressed", e.keyCode, e.code);
                this.prevImage(e);
                break;
            case KEYCODE_RIGHTARROW:
                console.log("-> pressed", e.keyCode, e.code);
                this.nextImage(e);
                break;
        }
    }
    
    // From https://www.freecodecamp.org/news/javascript-debounce-example/
    // const processChanges = debounce(() => saveInput());
    debounce (func, timeout = 300){
        let timer;
        return (...args) => {
            if (!timer) {
                func.apply(this, args);
            }
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = undefined;
            }, timeout);
        };
    }

    simpleTouch (element, callback, ...args) {
        // TEMP no bounce  element.addEventListener('touchstart', this.debounce((estart) => {
        element.addEventListener('touchstart', (estart) => {
            estart.preventDefault();
            estart.stopPropagation();
            const t0 = estart.touches[0];
            const el = t0.target;
            const startX = t0.screenX;
            const startY = t0.screenY;
            /*element*/
            el.addEventListener('touchend', (eend) => {
                const t0 = eend.changedTouches[0];
                const endX = t0.screenX;
                const endY = t0.screenY;
                console.log("lb:sT:end eend=", eend);
                if (endX == startX && endY == startY) {
                    // good touch -- fire the callback
                    if (typeof(callback) == 'function') {
                        setTimeout(() => callback(eend, ...args));
                    }
                }
            }, { once: true });
        }); //);
    }

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
        console.log("method prevImage: currentII=%d", this.currentImageIndex);
        if (this.currentImageIndex == 0) {
            this.changeImage(this.album.length - 1);
        } else {
            this.changeImage(this.currentImageIndex - 1);
        }
    }

    nextImage (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("method nextImage: currentII=%d", this.currentImageIndex);
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
        console.log("method cTI: currentII=%d  targetUrl='%s'", this.currentImageIndex, targetUrl);
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
        this.simpleTouch(element, callback, args);
    }
        
    // FIXME does this handle being attached to more than one element ?!"!?
    // From http://www.javascriptkit.com/javatutors/touchevents2.shtml
    // Detect left/right swipe or simple touch on gallery pictures.
    // Goes to previous, next, clickthrough or nowhere.
    clickTouchOrSwipe (element, clickCallback, leftCallback, rightCallback) {
        const self = this;
        console.log("lb:cTOS surface=", element);

        // Simple click
        element.addEventListener('click', (eclick) => { 
            eclick.preventDefault();
            eclick.stopPropagation();
            clickCallback(eclick); 
        });

        // Touches -- simple or swipe left/right
        element.addEventListener('touchstart', function(estart) {
            estart.preventDefault();
            estart.stopPropagation();
            const touch = estart.changedTouches[0];
            let swipedir = '';
            let startX = touch.pageX;
            let startY = touch.pageY;
            let startTime = new Date().getTime(); // record time when finger first makes contact with surface
            element.addEventListener('touchend', function(eend) {
                eend.preventDefault();
                const touch = eend.changedTouches[0];
                const distX = touch.pageX - startX; // get horizontal dist traveled by finger while in contact with surface
                const distY = touch.pageY - startY; // get vertical dist traveled by finger while in contact with surface
                const endTime = new Date().getTime();
                const elapsedTime = endTime - startTime;
                console.log("cSTOS: %d,%d  %dms", distX, distY, elapsedTime);
                if (distX == 0 && distY == 0) {
                    console.log("lb:sD: zero distance -- t");
                    swipedir = 't';
                } else if (elapsedTime <= self.options.swipeallowedtime) {
                    if (Math.abs(distX) >= self.options.swipethreshold && Math.abs(distY) <= self.options.swiperestraint) {
                        swipedir = (distX < 0) ? 'l' : 'r';
                    } else {
                        // Very short swipe -- call it a touch  NO, ignore it
                        console.log("lb:sD: short distance (%d,%d) -- none", distX, distY);
                        swipedir = '';
                    }
                } else {
                    // too slow -- ignore swipe completely 
                    console.log("lb:sD: too slow  start=%d  end=%d  elapsed=%d", startTime, endTime, elapsedTime);
                    swipedir = '';
                }
                switch (swipedir) {
                    case 't':
                        if (typeof(clickCallback) == 'function') {
                            clickCallback(eend);
                        }
                        break;
                    case 'l':
                        if (typeof(leftCallback) == 'function') {
                            leftCallback(eend);
                        }
                        break;
                    case 'r':
                        if (typeof(rightCallback) == 'function') {
                            rightCallback(eend);
                        }
                        break;
                    default:
                        // do nothing
                }
            });
        });

        element.addEventListener('touchmove', function(emove) {
            emove.preventDefault(); // prevent scrolling when inside DIV   What?
        });
    }
        
    // FIXME does this handle being attached to more than one element ?!"!?
    // From http://www.javascriptkit.com/javatutors/touchevents2.shtml
    // Detect left/right swipe or simple touch on gallery pictures.
    // Goes to previous, next, clickthrough or nowhere.
    swipedetect (touchsurface /*, callback */) {
        const self = this;
        console.log("lb:swipeDetect surface=", touchsurface);

        touchsurface.addEventListener('touchstart', function(estart) {
            estart.preventDefault();
            const touch = estart.changedTouches[0];
            let swipedir = '';
            let startX = touch.pageX;
            let startY = touch.pageY;
            let startTime = new Date().getTime(); // record time when finger first makes contact with surface
            touchsurface.addEventListener('touchend', function(eend) {
                eend.preventDefault();
                const touch = eend.changedTouches[0];
                const distX = touch.pageX - startX; // get horizontal dist traveled by finger while in contact with surface
                const distY = touch.pageY - startY; // get vertical dist traveled by finger while in contact with surface
                const endTime = new Date().getTime();
                const elapsedTime = endTime - startTime;
                console.log("swipe: %d,%d  %dms", distX, distY, elapsedTime);
                if (distX == 0 && distY == 0) {
                    console.log("lb:sD: zero distance -- t");
                    swipedir = 't';
                } else if (elapsedTime <= self.options.swipeallowedtime) {
                    if (Math.abs(distX) >= self.options.swipethreshold && Math.abs(distY) <= self.options.swiperestraint) {
                        swipedir = (distX < 0) ? 'l' : 'r';
                    } else {
                        // Very short swipe -- call it a touch  NO, ignore it
                        console.log("lb:sD: short distance (%d,%d) -- none", distX, distY);
                        swipedir = '';
                    }
                } else {
                    // too slow -- ignore swipe completely 
                    console.log("lb:sD: too slow  start=%d  end=%d  elapsed=%d", startTime, endTime, elapsedTime);
                    swipedir = '';
                }
                //callback(swipedir, e);
                if (swipedir == 'r') {
                    self.prevImage(eend);
                } else if (swipedir == 'l') {
                    self.nextImage(eend);
                } else {    // no swipe, just simple touch
                    self.clickThroughImage(eend);
                }
            });
        });

        touchsurface.addEventListener('touchmove', function(emove) {
            emove.preventDefault(); // prevent scrolling when inside DIV   What?
        });
    }

    // Build html for the lightbox and the overlay.
    // Attach event handlers to the new DOM elements.
    // NOTE This happens as part of start(), after user has clicked an image.
    build () {
        console.log("BBBBBBBBBBBBBuild");

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
                    <img id=lb-image1 class=lb-element src="/images/spinnerSSA.gif">
                    <figcaption id=lb-figcap1 class=lb-element></figcaption>
                </figure>
            </div>
            <div id=lb-flex2 class="lb-flex lb-element">
                <figure id=lb-figure2 class="lb-element lb-figure">
                    <div id=lb-image2-prev class="lb-element lb-navclass"></div>
                    <div id=lb-image2-next class="lb-element lb-navclass"></div>
                    <img id=lb-image2 class=lb-element src="/images/spinnerSSA.gif">
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
        this.unit1.image.style.maxWidth = "" + this.options.max_width + "vw";
        this.unit2.image.style.maxWidth = "" + this.options.max_width + "vw";
        this.unit1.image.style.maxHeight = "" + this.options.max_height + "vh";
        this.unit2.image.style.maxHeight = "" + this.options.max_height + "vh";

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
        console.log("SSSSSSSSSSSSSSStart lbelement=", lbelement);
        if (!lbelement) {
            return; // shouldn't happen
        }

        // Apply user-supplied options 
        if (typeof lightboxSSAOptions == "object") {
            this.applyOptions(lightboxSSAOptions);
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
            /*
            if (srcsetString) {
                // Parse the string, and filter to just leave the "w" entries
                srcset = parseSrcset(srcsetString);
                srcset = filterSrcset(srcset, "w");
                srcset.sort((a, b) => a.w - b.w);
            }
            */
            /*
            // sizes -- from data-sizes or img
            let sizesString;
            sizesString = lbe.getAttribute('data-sizes');
            if (!sizesString) {
                if (img) {
                    sizesString = img.getAttribute('sizes');
                }
            }
            */
            //console.log("lbSSA: srcset = %o", srcset)
            // aspect ratio -- from data-aspect
            let aspect = lbe.getAttribute('data-aspect');
            if (aspect) {
                aspect = parseFloat(aspect);
            }
            if (!aspect || isNaN(aspect)) {
                aspect = 1.0; // arbitrary default
            }
            //console.log("lbSSA adding image: imageURL=%s linkURL=%s title=%s alt=%s caption=%s srcset=%o aspect=%f", imageURL, linkURL, title, alt, caption, srcset, aspect);
            self.album.push({
                name:         imageURL,
                url:          linkURL,
                title:        title,
                alt:          alt,
                caption:      caption,
                //srcset:       srcset,
                srcsetString: srcsetString,
                //sizesString:  sizesString,
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
            console.log("lb: no lightbox elements! dlB=%s", dataLightboxValue);
            // At least put the original element in the album
            addToAlbum(lbelement);
            imageNumber = 0;
        }
        console.log("imageNumber=%d  album: ", imageNumber, this.album);

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
            console.log("lb:changeImage: album is empty");
            return;
        }
        const self = this;  // for use within functions -- NEEDED?
        // The DOM figure/image/figcap we're about to modify:
        const figure = this.otherUnit.figure;
        const image = this.otherUnit.image;
        const figcap = this.otherUnit.figcap;
        // The album entry we're going to load:
        const albumEntry = this.album[imageNumber];
        if (!albumEntry) {
            console.log("lb:cI: albumEntry not set");
            return;
        }

        // Disable keyboard nav during transitions
        //??this.disableKeyboardNav();

        function onLoad (e) {
            // Get the dimensions of the image that the srcset mechanism has chosen:
            const image = e.target;
            console.log("onLoad: currentSrc=%s  width=%d", image.currentSrc, image.width);
            //image.style.maxWidth = "" + image.width + "px";
            //image.style.maxHeight = "" + image.height + "px";
            // ?? TODO naturalWidth/Height (instead of width/height) stop the getting smaller but,
            // even though they don't seem to be the original size of the file.
            figure.style.maxWidth = "" + image.naturalWidth + "px";  // TODO add border width    FIXME keeps getting smaller (sometimes)
            figure.style.maxHeight = "" + image.naturalHeight + "px";
            if (albumEntry.alt) {  // TODO ? move these three out of onLoad
                image.setAttribute('alt', albumEntry.alt);
            }
            if (albumEntry.title) {
                image.setAttribute('title', albumEntry.title);
            }
            if (albumEntry.caption) {
                figcap.innerHTML = albumEntry.caption;
            }
            image.style.cursor = (albumEntry.url ? "pointer" : "auto");
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

        /*
        // Decide which image from the srcset to use.
        // FIXME let browser do the work == just set srcset!!  and sizes and src
        // We're assuming that if srcset exists, we'll use it rather than src
        let newImageURL = albumEntry.name; // fallback value from src
        const srcset = albumEntry.srcset;
        if (srcset) {
            if (srcset.length == 1) {
                // Hobson's choice
                newImageURL = srcset[0].url;
            } else {
                // Need to get current window dimensions
                const winWidth = window.innerWidth;
                const winHeight = window.innerHeight;
                // then use aspect to work out the limiting direction
                const winAspect = winWidth / winHeight;
                const imageAspect = this.album[imageNumber].aspect;
                let usableWidth;
                if (imageAspect > winAspect) {
                    // image is more landscape -- we're limited by width
                    // and need a bit of space for < > arrows (sadly).
                    usableWidth = winWidth * (self.options.max_width / 100);
                } else {
                    // image is more portraint -- we're limited by height
                    usableWidth = winHeight * (self.options.max_height / 100) * imageAspect;
                }
                // Loop through srcset -- it's already in ascending order by width
                // We're choosing the smallest that at least as big to avoid enlarging,
                // but maybe a nearly-big enough image would be better than going for a much bigger one.
                for (const src of srcset) {
                    if (src.w >= usableWidth) {
                        newImageURL = src.url;
                        break;
                    }
                }
                // If we didn't choose any from srcset, they're all too small.
                // Is the src image better?  Would it be easier if src were in srcset?
                // For now, we'll stick with the fallback src assigned above if none from srcset were chosen.
            }
        }
        */

        // Load the new image -- it will have opacity 0 at first
        // (this fires the onLoad function above) 
        //       image.setAttribute("src", newImageURL);
        image.setAttribute("src", albumEntry.name);
        image.setAttribute("srcset", albumEntry.srcsetString);
        // NO! the sizes string is tailored for figset's size value e.g. size=small, so it's no use here!!
        //image.setAttribute("sizes", albumEntry.sizesString);
        image.setAttribute("sizes", "" + this.options.max_width + "vw");
        this.currentImageIndex = imageNumber;

    }; // end of changeImage()

    // Make the lightbox stuff visible
    showLightbox () {
        this.fadeTo(this.overlay, this.options.fade_duration, this.options.overlay_opacity, ()=>{
            console.log("overlay fadeIn complete");
        });
    }

    /*
    // From https://gomakethings.com/how-to-get-all-of-an-elements-siblings-with-vanilla-js/
    getSiblings (elem, includeSelf = true) {
        // Setup siblings array and get the first sibling
        const siblings = [];
        let sibling = elem.parentNode.firstChild;
        // Loop through each sibling and push to the array
        while (sibling) {
            if (sibling.nodeType === 1 && (includeSelf || (sibling !== elem))) {
                siblings.push(sibling);
            }
            sibling = sibling.nextSibling
        }
        return siblings;
    };
    */

    // Display the image and its details and begin preloading neighbouring images.
    // Fades out the current image, fades in the other one, then swaps the pointers.
    showImage () {  // (width, height) 
        //console.log("showImage swapping from %s to %s", this.currentUnit.id, this.otherUnit.id);
        this.currentUnit.imagePrev.style['pointer-events'] = 'none';
        this.currentUnit.imageNext.style['pointer-events'] = 'none';
        // TODO? don't bother to fade if already at the target opacity
        this.fadeTo(this.currentUnit.flex, this.options.fade_duration, 0.0, (e) => {
            //requestAnimationFrame(() =>{console.log("fade out current finished");});
            console.log("fade out current finished  e=", e);
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
        console.log("DDDDDDDDDDDDDDDDDDDDDDDismantling");
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

