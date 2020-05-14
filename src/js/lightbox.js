//
// LightboxSSA v2.12
// Modified by Chris Dennis...
// - changed DOM -- simplified, data-lightbox now works on any element, not just <a>, I use <figure>
// - fancy cursors indicate where prev/next clickable areas are -- now outside the image
// - added link-through for clicking on the image.

// Forked May 2020 from:
// Lightbox v2.11.1
// by Lokesh Dhakar
//
// More info:
// http://lokeshdhakar.com/projects/lightbox2/
//
// Copyright Lokesh Dhakar
// Released under the MIT license
// https://github.com/lokesh/lightbox2/blob/master/LICENSE
//

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
// - is lb-cancel needed?
// - keyboard < > esc
// - swiping
// - hide <> arrows on swipable / narrow screens 
//   - and/or allow prev/next touches on edges of image
// - hide prev or nav if only two images?
// - use title as tool tip? or add details?
// - fine-tune prev/next arrows on narrow screens: remove padding in the .png's, and position the arrow
//     a small distance from the edge -- see https://css-tricks.com/almanac/properties/b/background-position/
// - disable scroll thing - to get rid of scroll bar
// - more Aria stuff?
// - on click/mouse/pointer events should return quickley -- maybe just prevent further clicks, and then call start() from a timeout.
// - get caption from figcaption
// - window resize (e.g. pressing F12) breaks aspect ratio
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

class LightboxSSA {

    constructor (options) {
        this.album = [];
        this.currentImageIndex = 0;
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
            max_width: "90%",
            max_height: "90%",
            //resizeDuration: 700,
            wrap_around: true,
            disable_scrolling: true, // hide scrollbar so that lightbox uses full area of window
            // Sanitize Title
            // If the caption data is trusted, for example you are hardcoding it in, then leave this to false.
            // This will free you to add html tags, such as links, in the caption.
            // If the caption data is user submitted or from some other untrusted source, then set this to true
            // to prevent xss and other injection attacks.
            sanitize_title: false,
            min_nav_width: 50, // Space for arrow *outside* the image area.  Arrow images are 50px wide.
            placeholderImage: '/images/imageNotFound.png',
        };
        this.options = {};
        //this.options = $.extend(this.options, this.defaults, options);
        this.options = {...this.options, ...this.defaults, ...options}

        this.init();
    }

    // TODO not used
    imageCountLabel (currentImageNum, totalImages) {
        return this.options.album_label.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
    };

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
            alert('lbssa ready and enabled');
        });
    };

    // enable() is called via init() when page (i.e. JS) is loaded
    enable () {
        var self = this;
        /*
        $('body').on('click', '[data-lightbox]', function(event) {    // FIXME or touchstart?
    //            alert("c/t on a d-t item");
            self.start($(event.currentTarget));
            return false;
        });
        */
        
        // Attach click/touch/pointer listeners to every element on the page
        // that has [data-lightbox] in its attributes.
        // (This requires that DOM is ready, but happens before the lightbox has been built)

        // NEXT: http://jsfiddle.net/f4he2y9d/ shows that tapping a button works on android, but not if I change it to an img.  what about a figure?

        // pointer-events are a bit new? -- might not be the answer

//        document.body.addEventListener('touchstart', function (e) {alert("ouch!")});  // see stackoverflow.com/questions/44928042
        const matches = document.querySelectorAll("[data-lightbox]");
        matches.forEach(function(match) {
            // try this as suggested by https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
            // works on desktop/emulator, not android
            //match.onpointerdown = function (e) {
            /*
            match.addEventListener('pointerdown', function (e) {
                alert("pointer down");
                self.start(e.currentTarget);
                //return false;
            }, true); // true -- usecapture
            */
            match.addEventListener('touchstart', function (e) {
                // This works on emualtor -- and bubbles to say ouch!
                alert("touchstart on a d-l");
                //e.preventDefaults();    // apparently stops the /emulated/ mouse events being triggered too
                //  See developer.mozilla.org ... "supporting both touch and mouse events" (but mouse events (i.e. movements) are not clicks)
                self.start(e.currentTarget);
            }, true);
            match.addEventListener('click', function (e) {
                alert("click on a d-l");
                //e.preventDefaults();  // e.g. to stop an <a data-lightbox=x> doing the <a>'s href
                self.start(e.currentTarget);
            }, true);
        });
    };

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
                <img id=lb-image1 class=lb-element src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==">
            </div>
            <div id=lb-flex2 class="lb-flex lb-element">
                <img id=lb-image2 class=lb-element src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==">
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
        this.image1     = document.getElementById('lb-image1');
        this.image2     = document.getElementById('lb-image2');
        this.lbelements = document.getElementsByClassName('lb-element');

        // Override CSS depending on options
        this.image1.style['max-width'] = this.options.max_width;
        this.image1.style['max-height'] = this.options.max_height;
        this.image2.style['max-width'] = this.options.max_width;
        this.image2.style['max-height'] = this.options.max_height;
        //this.$image1.css("max-width", this.options.max_width);
        //this.$image1.css("max-height", this.options.max_height);
        //this.$image2.css("max-width", this.options.max_width);
        //this.$image2.css("max-height", this.options.max_height);

        // Attach event handlers
        //this.$overlay.on('click', () => {
        //    this.dismantle();
        //    return false;
        //});
        self = this;
        this.overlay.addEventListener('click', this.dismantle.bind(this), false);
        this.overlay.addEventListener('touchstart', this.dismantle.bind(this), false);

        /*
        this.$prev.on('click', () => {
            if (this.currentImageIndex === 0) {
                this.changeImage(this.album.length - 1);
            } else {
                this.changeImage(this.currentImageIndex - 1);
            }
            return false;
        });
        */
        function prevImage () {
            // TODO check wrap_around
            if (this.currentImageIndex == 0) {
                this.changeImage(this.album.length - 1);
            } else {
                this.changeImage(this.currentImageIndex - 1);
            }
        }
        this.prev.addEventListener('click', prevImage.bind(this), false);
        this.prev.addEventListener('touchstart', prevImage.bind(this), false);

        /*
        this.$next.on('click', () => {
            if (this.currentImageIndex === this.album.length - 1) {
                this.changeImage(0);
            } else {
                this.changeImage(this.currentImageIndex + 1);
            }
            return false;
        });
        */
        function nextImage () {
            if (this.currentImageIndex === this.album.length - 1) {
                this.changeImage(0);
            } else {
                this.changeImage(this.currentImageIndex + 1);
            }
        }
        this.next.addEventListener('click', nextImage.bind(this), false);
        this.next.addEventListener('touchstart', nextImage.bind(this), false);

        /*
        this.$image1.on('click', (event) => {
            // this.currentImageIndex is evaluated at click time, so gives the correct URL.
            if (this.album[this.currentImageIndex].url) {
                // Jump to the given URL
                window.location = this.album[this.currentImageIndex].url;
            }
            return false;
        });
        this.$image2.on('click', (event) => {
            // this.currentImageIndex is evaluated at click time, so gives the correct URL.
            if (this.album[this.currentImageIndex].url) {
                // Jump to the given URL
                window.location = this.album[this.currentImageIndex].url;
            }
            return false;
        });
        */
        // Honour a click on the current lightbox image (either 1 or 2).
        // If the image has no URL, it's clickability will have been turned off, but we'll check anyway.
        function clickThroughImage () {
            // this.currentImageIndex is evaluated at click time, so gives the correct URL.
            if (this.album[this.currentImageIndex].url) {
                // Jump to the given URL
                window.location = this.album[this.currentImageIndex].url;
            }
        }
        this.image1.addEventListener('click', clickThroughImage.bind(this), false);
        this.image1.addEventListener('touchstart', clickThroughImage.bind(this), false);
        this.image2.addEventListener('click', clickThroughImage.bind(this), false);
        this.image2.addEventListener('touchstart', clickThroughImage.bind(this), false);

        /*
        this.$loader.on('click', function() {
            self.dismantle();
            return false;
        });
        */
    }; // end of build()

    fadeTo (element, duration, opacity, completeFn = null) {
        if (completeFn) {
            element.addEventListener('transitionend', completeFn, { once: true, capture: true });
            //setTimeout(completeFn, duration);
        }
        element.style['transition-property'] = 'opacity';
        element.style['transition-duration'] = '3s';    //duration + 'ms';
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
            this.options = {...this.options, ...lightboxSSAOptions}
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
                    let img = lbelement.querySelector('img');
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
            let linkURL = lbelement.getAttribute('data-url');
            if (!linkURL) {
                if (tag == 'FIGURE') {
                    //let $imgs = $lbelement.find('img');
                    //if ($imgs.length > 0) {
                    //   linkURL = $imgs.attr('data-url');
                    //}
                    let img = lbelement.querySelector('img');
                    if (img) {
                        linkURL = img.getAttribute('data-url');
                    }
                } else if (tag == 'A') {
                    linkURL = lbelement.getAttribute('href');
                }
            }
            // (no linkURL is OK)       
            //console.log("adding image ", $lbelement, ", imageURL is ", imageURL, ", linkURL is ", linkURL);
            // TODO Caption -- maybe get it from figcaption
            self.album.push({
                name:    imageURL,
                url:     linkURL,
                alt:     lbelement.getAttribute('data-alt'),
                title:   lbelement.getAttribute('data-title') || lbelement.getAttribute('title'),
                srclist: lbelement.getAttribute('data-imagelist'),
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
        this.currentImageIndex = imageNumber;   // FIXME is this the right place/time to update cII ?

    }; // end of changeImage()

    // Make the lightbox stuff visible
    showLightbox () {
        this.fadeTo(this.overlay, this.options.fade_duration, this.options.overlay_opacity, ()=>{
            //console.log("overlay fadeIn complete");
        });
    }

    // Display the image and its details and begin preload neighbouring images.
    // Fades out the current image, fades in the other one, then swaps the pointers.
    showImage () {  // (width, height) 
        //this.$loader.stop(true).hide();   // FIXME reinstate this
        // TODO ? also disable other clicks and keyboard events before the swap?
        // TODO ?? swap z-index values
        this.currentImage.style["pointer-events"] = "none";
        //this.currentImage.style["touch-action"] = "none";    // FIXME touch action needed?
        this.fadeTo(this.currentImage, this.options.image_fade_duration, 0);
        this.fadeTo(this.otherImage, this.options.image_fade_duration+10, 1, () => {    // function() {
            // Swap the images
            const temp = this.otherImage;
            this.otherImage = this.currentImage;
            this.currentImage = temp;
            this.currentImage.style["pointer-events"] = "auto";
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

/*
    return new LightboxSSA();
}));
*/
