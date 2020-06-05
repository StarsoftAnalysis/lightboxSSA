// LightboxSSA v2.50
// Copyright 2020 Chris Dennis

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

// data- attributes
// - data-lightbox="galleryname"
// - data-title="image title"
// - data-alt="alt info"
// - data-url="http... "   - link when lightboxed image is clicked - optional - if present, we wrap the <img> with a <a>
    // OR -- don't wrap it, just add an on.click and a pointer
// Oh2 -- no javascript? should fall back to showing the image.  or fallback to just showing the image/gallery?  The latter
// I'll change that to put the data- attributes in the <fig>, so no wrapping <a> required.
//  -- see enable() applying click to anything with a data-lightbox
//  -- so user can do <a data-lightbox...> if they want non-JS clickability

// TODO
// - is lb-cancel needed? maybe reinstate lb-loader because it's slower on real server 
// - preload next/prev images
// - it's a class, but use of # implies only one...
// - keyboard < > esc
// - fix fadeTo and jumpy timing sometimes
// - preload neighbours
// - loading spinner
// - keyboard < > esc -- also back button to close lb
//  - highlight something during touchmove
// - hide/disable prev or nav if only two images?
// - use title as tool tip? or add details?
// - more Aria stuff?
// - get caption from figcaption
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

class LightboxSSA {

    constructor (options) {
        this.album = [];
        this.currentImageIndex = 0;
        this.constants = {
            // 'constants' defined e.g. in CSS
            arrowInset: 20, // distance of <> arrows from edge of window, in px
            arrowWidth: 31,
        };
        // NOTE: these have to be lowercase or snake_case because of the way they can be
        // set e.g. via Hugo params
        this.defaults = {
            album_label: 'Image %1 of %2',
            show_image_number_label: false,    // TODO not reimplemented
            always_show_nav_on_touch_devices: false,
            fade_duration: 600,  // for overlay
            overlay_opacity: 0.9,
            image_fade_duration: 600,
            max_size: 50000,
            max_width: 90,
            max_height: 90,
            //resizeDuration: 700,
            wrap_around: true,
            disable_scrolling: false, // hide scrollbar so that lightbox uses full area of window
            // Sanitize Title
            // If the caption data is trusted, for example you are hardcoding it in, then leave this to false.
            // This will free you to add html tags, such as links, in the caption.
            // If the caption data is user submitted or from some other untrusted source, then set this to true
            // to prevent xss and other injection attacks.
            sanitize_title: false,
            min_nav_width: this.constants.arrowWidth, // Space for arrow *outside* the image area.  Arrow images are 31px wide.
            placeholderImage: '/images/imageNotFoundSSA.png',
        };
        this.options = Object.assign({}, this.defaults);
        //this.options = $.extend(this.options, this.defaults, options);
        //this.options = {...this.options, ...this.defaults, ...options}
        this.applyOptions(options);

        this.init();
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

    // TODO not used
    imageCountLabel (currentImageNum, totalImages) {
        return this.options.album_label.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
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

    // init() is called from constructor -- could be merged  TODO
    init () {
        var self = this;
        this.docReady(function() {
            // Now in start():  self.build();
            self.enable();
            //alert('lbssa ready and enabled');
        });
    }

    imageClickHandler (e) {
        e.preventDefault();
        e.stopPropagation();
        const lbelement = e.currentTarget;
        setTimeout(() => {  // Use timeout to return from event quickly
            this.start(lbelement);
        }, 0);
    }

    // enable() is called via init() when page (i.e. JS) is loaded
    enable () {
        var self = this;
        
        // Attach click/touch/pointer listeners to every element on the page
        // that has [data-lightbox] in its attributes.
        // (This requires that DOM is ready, but happens before the lightbox has been built)
        const matches = document.querySelectorAll("[data-lightbox]");
        matches.forEach(function(match) {
            match.addEventListener('touchstart', self.imageClickHandler.bind(self), true);
            /*match.addEventListener('touchstart', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const lbelement = e.currentTarget;
                setTimeout(() => {  // Use timeout to return from event quickly
                    self.start(e.currentTarget);
                }, 0);
            }, true);*/
            match.addEventListener('click', self.imageClickHandler.bind(self), true);
            /*match.addEventListener('click', function (e) {
                e.preventDefault();  // e.g. to stop an <a data-lightbox=x> doing the <a>'s href
                e.stopPropagation();
                const lbelement = e.currentTarget;
                setTimeout(function () {  // Use timeout to return from event quickly
                    self.start(lbelement);
                }, 0);
            }, true);*/
        });
    }

    windowWidth () { // from https://stackoverflow.com/questions/6942785/
        return window.innerWidth && document.documentElement.clientWidth ? 
            Math.min(window.innerWidth, document.documentElement.clientWidth) : 
            window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    }
 
    // From http://www.javascriptkit.com/javatutors/touchevents2.shtml
    swipedetect (touchsurface, callback) {
        let swipedir, startX, startY, distX, distY, elapsedTime, startTime;
        let handleswipe = callback; // || function(swipedir) {};
        const threshold = 100;  // required min distance traveled to be considered swipe
        const restraint = 70;   // maximum distance allowed at the same time in perpendicular direction
        const allowedTime = 400; // maximum time allowed to travel that distance

        touchsurface.addEventListener('touchstart', function(e) {
            const touchobj = e.changedTouches[0];
            swipedir = 'none';
            startX = touchobj.pageX;
            startY = touchobj.pageY;
            startTime = new Date().getTime(); // record time when finger first makes contact with surface
            e.preventDefault();
        }, false);

        touchsurface.addEventListener('touchmove', function(e) {
            e.preventDefault(); // prevent scrolling when inside DIV
        }, false);

        touchsurface.addEventListener('touchend', function(e) {
            let touchobj = e.changedTouches[0];
            distX = touchobj.pageX - startX; // get horizontal dist traveled by finger while in contact with surface
            distY = touchobj.pageY - startY; // get vertical dist traveled by finger while in contact with surface
            elapsedTime = new Date().getTime() - startTime; // get time elapsed
            //console.log("swipe: ", distX, distY, elapsedTime);
            //alert("swipe: X=" + distX + " Y=" + distY + "time=" + elapsedTime);
            if (elapsedTime <= allowedTime) {                                               // first condition for swipe met
                if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {         // 2nd condition for horizontal swipe met
                    swipedir = (distX < 0) ? 'left' : 'right';                              // if dist travelled is negative, it indicates left swipe
                } else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {  // 2nd condition for vertical swipe met
                    swipedir = (distY < 0) ? 'up' : 'down';                                 // if dist travelled is negative, it indicates up swipe
                }
            }
            if (handleswipe) {
                handleswipe(swipedir, e);
            }
            e.preventDefault();
        }, false);
    }

    // Build html for the lightbox and the overlay.
    // Attach event handlers to the new DOM elements.
    // NOTE This happens as part of start(), after user has clicked an image.
    build () {
        // FIXME what's this?
        //if ($('#lb-overlay').length > 0) {  // Presumably avoiding reentry
        //    return;
        //}

        if (this.options.disable_scrolling) {
            this.oldBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }

        const html = `
            <div id=lb-overlay class=lb-element></div>
            <div id=lb-nav class=lb-element>
                <div id=lb-prev aria-label="Previous image" class=lb-element></div>
                <div id=lb-next aria-label="Next image" class=lb-element></div>
            </div>
            <div id=lb-flex1 class="lb-flex lb-element">
                <div id=lb-wrapper1 class=lb-element>
                    <img id=lb-image1 class=lb-element src="/images/spinnerSSA.gif">
                    <div id=lb-image1-prev class=lb-element></div>
                    <div id=lb-image1-next class=lb-element></div>
                </div>
            </div>
            <div id=lb-flex2 class="lb-flex lb-element">
                <div id=lb-wrapper2 class=lb-element>
                    <img id=lb-image2 class=lb-element src="/images/spinnerSSA.gif">
                    <div id=lb-image2-prev class=lb-element></div>
                    <div id=lb-image2-next class=lb-element></div>
                </div>
            </div>
        `;
        //$(html).appendTo($('body'));
        document.body.insertAdjacentHTML('beforeend', html);

        // Cache DOM objects
        this.overlay    = document.getElementById('lb-overlay');
        this.nav        = document.getElementById('lb-nav');
        this.prev       = document.getElementById('lb-prev');
        this.next       = document.getElementById('lb-next');
        this.flex1      = document.getElementById('lb-flex1');
        this.flex2      = document.getElementById('lb-flex2');
        this.wrapper1   = document.getElementById('lb-wrapper1');
        this.wrapper2   = document.getElementById('lb-wrapper2');
        this.image1     = document.getElementById('lb-image1');
        this.image2     = document.getElementById('lb-image2');
        this.image1prev = document.getElementById('lb-image1-prev');
        this.image1next = document.getElementById('lb-image1-next');
        this.image2prev = document.getElementById('lb-image2-prev');
        this.image2next = document.getElementById('lb-image2-next');
        this.lbelements = document.getElementsByClassName('lb-element');

        /*??
        // Override CSS depending on options
        // TODO get window width, make sure there's room for the <> arrows -- add a bit of spacing if possible.
        //  - need to get current window width...  and redo the calculation on window resize.  Pity -- it's all automatic at the moment.
        const winWidth = this.windowWidth();
        const maxWidthPixels = winWidth * this.options.max_width / 100;
        if ((winWidth - maxWidthPixels) < (2 * (this.constants.arrowWidth + this.constants.arrowInset))) {
            // remove the arrow inset
            this.prev['background-position'] = 'left  center';
            this.next['background-position'] = 'right center';
        } else {
            // include the inset
            this.prev['background-position'] = 'left '  + (this.constants.arrowInset) + 'px center';
            this.next['background-position'] = 'right ' + (this.constants.arrowInset) + 'px center';
        }
        const max_width = (Math.min(maxWidthPixels, winWidth - 2*this.constants.arrowWidth)) + "px";
        this.image1.style['max-width']  = max_width; // "calc(90% - 51px)";   //this.percentString(this.options.max_width);
        this.image1.style['max-height'] = this.options.max_height;
        this.image2.style['max-width']  = max_width; //this.percentString(this.options.max_width);
        this.image2.style['max-height'] = this.options.max_height;
        */

        // Attach event handlers
        const self = this;
        this.overlay.addEventListener('click', this.dismantle.bind(this), false);
        this.overlay.addEventListener('touchstart', this.dismantle.bind(this), false);

        function prevImage (e) {
            if (e) {    // e is null if via swipe
                e.preventDefault();
                e.stopPropagation();
            }
            // TODO check wrap_around
            if (this.currentImageIndex == 0) {
                this.changeImage(this.album.length - 1);
            } else {
                this.changeImage(this.currentImageIndex - 1);
            }
        }
        this.prev.addEventListener('click', prevImage.bind(this), false);
        this.prev.addEventListener('touchstart', prevImage.bind(this), false);
        this.image1prev.addEventListener('click', prevImage.bind(this), false);
        this.image1prev.addEventListener('touchstart', prevImage.bind(this), false);
        this.image2prev.addEventListener('click', prevImage.bind(this), false);
        this.image2prev.addEventListener('touchstart', prevImage.bind(this), false);

        function nextImage (e) {
            if (e) {    // e is null if via swipe
                e.preventDefault();
                e.stopPropagation();
            }
            if (this.currentImageIndex === this.album.length - 1) {
                this.changeImage(0);
            } else {
                this.changeImage(this.currentImageIndex + 1);
            }
        }
        this.next.addEventListener('click', nextImage.bind(this), false);
        this.next.addEventListener('touchstart', nextImage.bind(this), false);
        this.image1next.addEventListener('click', nextImage.bind(this), false);
        this.image1next.addEventListener('touchstart', nextImage.bind(this), false);
        this.image2next.addEventListener('click', nextImage.bind(this), false);
        this.image2next.addEventListener('touchstart', nextImage.bind(this), false);

        // Honour a click on the current lightbox image (either 1 or 2).
        // If the image has no URL, it's clickability will have been turned off, but we'll check anyway.
        // If via swipe, e is null.
        function clickThroughImage (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            // this.currentImageIndex is evaluated at click time, so gives the correct URL.
            if (this.album[this.currentImageIndex].url) {
                // Jump to the given URL
                window.location = this.album[this.currentImageIndex].url;
            }
        }
        this.image1.addEventListener('click', clickThroughImage.bind(this), false);
        //this.image1.addEventListener('touchstart', clickThroughImage.bind(this), false);
        this.image2.addEventListener('click', clickThroughImage.bind(this), false);
        //this.image2.addEventListener('touchstart', clickThroughImage.bind(this), false);

        this.swipedetect(this.image1, function (swipedir, e) {
            // swipedir contains either "none", "left", "right", "top", or "down"
            //console.log("image1 detected swipe", swipedir);
            //alert("image1 detected swipe: " + swipedir);
            if (swipedir == 'right' || swipedir == 'down') {
                prevImage.bind(self)(e);
            } else if (swipedir == 'left' || swipedir == 'up') {
                nextImage.bind(self)(e);
            } else {    // no swipe, just simple touch
                clickThroughImage.bind(self)(e);
            }
        });

        this.swipedetect(this.image2, function (swipedir, e) {
            // swipedir contains either "none", "left", "right", "top", or "down"
            //console.log("image2 detected swipe", swipedir);
            //alert("image2 detected swipe:" + swipedir);
            if (swipedir == 'right' || swipedir == 'down') {
                prevImage.bind(self)(e);
            } else if (swipedir == 'left' || swipedir == 'up') {
                nextImage.bind(self)(e);
            } else {    // no swipe, just simple touch
                clickThroughImage.bind(self)(e);
            }
        });

        /*
        this.$loader.on('click', function() {
            self.dismantle();
            return false;
        });
        */
    }; // end of build()

    fadeTo (element, duration, opacity, completeFn = null) {
        if (completeFn) {
            // FIXME can't get transitionend to work, just use a timeout
            //element.addEventListener('transitionend', completeFn, { once: true, capture: true });
            setTimeout(completeFn, duration);
        }
        element.style['transition-property'] = 'opacity';
        element.style['transition-duration'] = duration + 'ms';
        // Do the fade after a short delay to let the CSS changes take effect:
        setTimeout(function() {
            element.style.opacity = opacity;
        }, 50);
    }

    // User has clicked on an element with 'data-lightbox'.
    // Show lightbox. If the image is part of a set, add siblings to album array.
    start (lbelement) {
        // lbelement is the thing clicked on -- typically a <figure> or <image>. -- no longer a $jquery thing!

        // Apply user-supplied options 
        if (typeof lightboxSSAOptions == "object") {
            //$.extend(this.options, lightboxSSAOptions);
            //this.options = {...this.options, ...lightboxSSAOptions}
            this.applyOptions(lightboxSSAOptions);
        }

        this.build();
        // FIXME keyboard stuff isn't working -- need to do the non-JS version of this:
        //this.$overlay.focus();
        this.showLightbox();

        this.album = [];
        let imageNumber = 0;

        const self = this;
        function addToAlbum (lbe) {
            const tag = lbe.tabname; //$lbelement.prop("tagName");
            // Image can be from: -- searched in this order
            // - data-image
            // - <img>'s src
            // - <figure>'s (first) <img>'s src
            // - <a>'s <img>'s src
            //var imageURL = $lbelement.attr('data-image');
            let imageURL = lbe.getAttribute('data-image');  // returns null or "" if not there

            if (!imageURL) {
                if (tag == 'IMG') {
                    imageURL = lbe.getAttribute('src');
                } else if (tag == 'FIGURE' || tag == 'A') {
                    // Find the first img (if any)
                    //let $imgs = $lbelement.find('img'); // TO HERE
                    //if ($imgs.length > 0) {
                    //    imageURL = $imgs.attr('src');
                    //}
                    let img = lbe.querySelector('img');
                    if (img) {
                        imageURL = img.getAttribute('src');
                    }
                }
            }
            if (!imageURL) {
                imageURL = 'missingImage.jpg';
            }
            //console.log("imageURL: ", imageURL);
            // Link URL is from data-url or <fig>'s <img>'s data-url or <a>'s href
            // - <a>'s href - how to check if that is an image?
            let linkURL = lbe.getAttribute('data-url');
            if (!linkURL) {
                if (tag == 'FIGURE') {
                    //let $imgs = $lbelement.find('img');
                    //if ($imgs.length > 0) {
                    //   linkURL = $imgs.attr('data-url');
                    //}
                    let img = lbe.querySelector('img');
                    if (img) {
                        linkURL = img.getAttribute('data-url');
                    }
                } else if (tag == 'A') {
                    linkURL = lbe.getAttribute('href');
                }
            }
            // (no linkURL is OK)       
            //console.log("adding image ", $lbelement, ", imageURL is ", imageURL, ", linkURL is ", linkURL);
            // TODO Caption -- maybe get it from figcaption
            self.album.push({
                name:    imageURL,
                url:     linkURL,
                alt:     lbe.getAttribute('data-alt'),
                title:   lbe.getAttribute('data-title') || lbe.getAttribute('title'),
                srclist: lbe.getAttribute('data-imagelist'),
            });
        } // end of addToAlbum

        //var dataLightboxValue = $lbelement.attr('data-lightbox');    // dLV gets 'lightbox' or the name of the gallery
        const dataLightboxValue = lbelement.getAttribute('data-lightbox');
        // Find all elements with the same gallery name.  querySelectorAll returns them in document order.
        const lbelements = document.querySelectorAll('[data-lightbox="' + dataLightboxValue + '"]');
        let i = 0;
        //for (var i = 0; i < $lbelements.length; i += 1) {
        lbelements.forEach(function(lbe) {
            //addToAlbum($($lbelements[i]));
            addToAlbum(lbe);
            //if ($lbelements[i] === $lbelement[0]) {
            //if ($lbelements[i] === lbelement) {
            if (lbe === lbelement) {
                imageNumber = i;
            }
            i += 1;
        });

        this.albumLen = this.album.length;
        if (this.albumLen == 1) {
            // nowhere to navigate to
            //this.$nav.hide();
            this.fadeTo(this.nav, this.options.fadeDuration, 0);
        }
        if (this.albumLen == 2 && !this.options.wrap_around) {
            // TODO adjust arrows by hiding prev or next
        }
        this.currentImage = this.image1;
        this.otherImage = this.image2;
        this.changeImage(imageNumber);
    }; // end of start()

    // TODO need to know which way we're going to optimise loading of prev and next ?  FOR NOW rely on browser's cacheing, and just get prev and next the simple way
    // (depends on length of album)
    // Load the specified image as this.$otherImage, adjust its size, then call showImage() to swap images
    changeImage (imageNumber) {
        const self = this;
        const image = this.otherImage;

        // Disable keyboard nav during transitions
        this.disableKeyboardNav();

        function onLoad () {
            // 'self' is the lightbox object
            // 'image' is the DOM object (either lb-image1 or lb-image2)

            image.setAttribute('alt', self.album[imageNumber].alt);
            image.setAttribute('title', self.album[imageNumber].title);
            // TODO Caption?
            
            image.style.cursor = (self.album[imageNumber].url ? "pointer" : "auto");

            self.showImage();

        }; // end of onload function

        function onError () {
            // Expected image not found -- use placeholder
            this.src = self.options.placeholderImage;
        }

        image.addEventListener('load', onLoad, { once: true });
        image.addEventListener('error', onLoad, { once: true });

        // Load the new image -- it will have opacity 0 at first
        image.setAttribute("src", this.album[imageNumber].name);
        this.currentImageIndex = imageNumber;

    }; // end of changeImage()

    // Make the lightbox stuff visible
    showLightbox () {
        this.fadeTo(this.overlay, this.options.fade_duration, this.options.overlay_opacity, ()=>{
            //console.log("overlay fadeIn complete");
        });
    }

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

    // Display the image and its details and begin preload neighbouring images.
    // Fades out the current image, fades in the other one, then swaps the pointers.
    showImage () {  // (width, height) 
        //this.$loader.stop(true).hide();   // FIXME reinstate this
        // TODO ? also disable other clicks and keyboard events before the swap?
        //this.currentImage.style["pointer-events"] = "none";
        const siblings = this.getSiblings(this.currentImage);
        //console.log("1. siblings:", siblings);
        for (let i = 0; i < siblings.length; i++) {
            //console.log("siblings[i]:", siblings[i]);
            siblings[i].style['pointer-events'] = 'none';
        }
        //this.currentImage.style["touch-action"] = "none";    // FIXME touch action needed?
        this.fadeTo(this.currentImage, this.options.image_fade_duration, 0);
        this.fadeTo(this.otherImage, this.options.image_fade_duration+10, 1, () => {    // function() {
            // Swap the images
            const temp = this.otherImage;
            this.otherImage = this.currentImage;
            this.currentImage = temp;
            //this.currentImage.style["pointer-events"] = "auto";
            const siblings = this.getSiblings(this.currentImage);
            //console.log("2. siblings:", siblings);
            for (let i = 0; i < siblings.length; i++) {
                //console.log("siblings[i]:", siblings[i]);
                siblings[i].style['pointer-events'] = 'auto';
            }
            //this.currentImage.style["touch-action"] = "auto";
            //this.updateNav();
            this.preloadNeighboringImages();
            this.enableKeyboardNav();  // FIXME move this start() or build() -- no, need to disable nav during changeImage 
        });
        //}.bind(this));
    }

    // Display previous and next navigation if appropriate.
    /* Still needed?
    updateNav () {
        // Check to see if the browser supports touch events. If so, we take the conservative approach
        // and assume that mouse hover events are not supported and always show prev/next navigation
        // arrows in image sets.
        let alwaysShowNav = false;
        try {
            document.createEvent('TouchEvent');
            alwaysShowNav = this.options.always_show_nav_on_touch_devices;   //) ? true : false;
        } catch (e) {}

        // FIXME sort out arrow opacity -- is it still needed? yes, does .show() among other things.
        if (this.album.length > 1) {
            if (this.options.wrap_around) {
                if (alwaysShowNav) {
                    this.$overlay.find('.lb-prev, .lb-next').css('opacity', '1');
                }
                this.$overlay.find('.lb-prev, .lb-next').show();
            } else {
                if (this.currentImageIndex > 0) {
                    this.$overlay.find('.lb-prev').show();
                    if (alwaysShowNav) {
                        this.$overlay.find('.lb-prev').css('opacity', '1');
                    }
                }
                if (this.currentImageIndex < this.album.length - 1) {
                    this.$overlay.find('.lb-next').show();
                    if (alwaysShowNav) {
                        this.$overlay.find('.lb-next').css('opacity', '1');
                    }
                }
            }
        }
    };
    */

    // Preload previous and next images in set.
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

    // FIXME does this still work?
    enableKeyboardNav () {
        /* TODO keyboard stuff
        this.$overlay.on('keyup.keyboard', this.keyboardAction.bind(this));
        this.$overlay.on('keyup.keyboard', this.keyboardAction.bind(this));
        */
    }

    disableKeyboardNav () {
        //this.$lightbox.off('.keyboard');
        // TODO this.$overlay.off('.keyboard');
    }

    keyboardAction (event) {
        const KEYCODE_ESC        = 27;
        const KEYCODE_LEFTARROW  = 37;
        const KEYCODE_RIGHTARROW = 39;

        let keycode = event.keyCode;
        if (keycode === KEYCODE_ESC) {
            // Prevent bubbling so as to not affect other components on the page.
            event.stopPropagation();
            this.dismantle();
        } else if (keycode === KEYCODE_LEFTARROW) {
            if (this.currentImageIndex !== 0) {
                this.changeImage(this.currentImageIndex - 1);
            } else if (this.options.wrap_around && this.album.length > 1) {
                this.changeImage(this.album.length - 1);
            }
        } else if (keycode === KEYCODE_RIGHTARROW) {
            if (this.currentImageIndex !== this.album.length - 1) {
                this.changeImage(this.currentImageIndex + 1);
            } else if (this.options.wrap_around && this.album.length > 1) {
                this.changeImage(0);
            }
        }
    };

    remove (element) {
        this.fadeTo(element, this.options.fade_duration, 0, function() {
            //element.parentNode.removeChild(element);
            // FIXME why don't we get here?
            element.remove();
        });
        /* FIXME not needed
        // Hack!
        setTimeout(function () {
            element.remove();
        }, this.options.fade_duration);
        */
    }

    // Unbuild the DOM structure
    dismantle () {
        for (let lbelement of this.lbelements) {
            this.remove(lbelement);
        };
        if (this.options.disable_scrolling) {
            document.body.style.overflow = this.oldBodyOverflow;
        }
    };

} // end of class LightboxSSA

// Create an (the only) instance of our Class.
// Can set options here.
const lbSSA = new LightboxSSA({});

