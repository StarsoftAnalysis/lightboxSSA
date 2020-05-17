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
// - not working on mobile!
// - is lb-cancel needed?
// - it's a class, but use of # implies only one...
// - keyboard < > esc
// - swiping
// - hide <> arrows on swipable / narrow screens 
// - hide prev or nav if only two images?
// - use title as tool tip? or add details?
// - fine-tune prev/next arrows on narrow screens: remove padding in the .png's, and position the arrow
//     a small distance from the edge -- see https://css-tricks.com/almanac/properties/b/background-position/
// - disable scroll thing - to get rid of scroll bar
// - more Aria stuff?
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

'use strict';

// Uses Node, AMD, or browser globals to create a module.
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.lightbox = factory(root.jQuery);
    }
}(this, function ($) {

class LightboxSSA {

    // NOTE: these have to be lowercase or snake_case because of the way they can be
    // set e.g. via Hugo params
    defaults = {
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
        disable_scrolling: true, // false,  ??
        // Sanitize Title
        // If the caption data is trusted, for example you are hardcoding it in, then leave this to false.
        // This will free you to add html tags, such as links, in the caption.
        // If the caption data is user submitted or from some other untrusted source, then set this to true
        // to prevent xss and other injection attacks.
        sanitize_title: false,
        min_nav_width: 50, // Space for arrow *outside* the image area.  Arrow images are 50px wide.
    };

    options = {};

    constructor (options) {
        this.album = [];
        this.currentImageIndex = 0;
        this.init();
        this.options = $.extend(this.options, this.defaults, options);
        this.placeholderImage = '/images/imageNotFound.png';    // TODO? put this in options
    }

    imageCountLabel (currentImageNum, totalImages) {
        return this.options.album_label.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
    };

    // init() is called from constructor -- could be merged  TODO
    init () {
        var self = this;
        // Both enable and build methods require the body tag to be in the DOM.
        $(document).ready(function() {
            // Now in start():  self.build();
            self.enable();
        });
    };

    enable () {
        var self = this;
        $('body').on('click', '[data-lightbox]', function(event) {
            self.start($(event.currentTarget));
            return false;
        });
    };

    // Build html for the lightbox and the overlay.
    // Attach event handlers to the new DOM elements. click click click
    // NOTE This happens when page is loaded, NOT when an image is clicked.
    build () {
        // FIXME what's this?
        if ($('#lb-overlay').length > 0) {  // Presumably avoiding reentry
            return;
        }

        const html = `
            <div id=lb-overlay></div>
            <div id=lb-nav>
                <div id=lb-prev aria-label="Previous image"></div>
                <div id=lb-next aria-label="Next image"></div>
            </div>
            <div id=lb-flex1 class=lb-flex>
                <img id=lb-image1 src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==">
            </div>
            <div id=lb-flex2 class=lb-flex>
                <img id=lb-image2 src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==">
            </div>
        `;
        $(html).appendTo($('body'));

        // Cache jQuery objects
        this.$overlay   = $('#lb-overlay');
        this.$nav       = $('#lb-nav');
        this.$prev      = $('#lb-prev');
        this.$next      = $('#lb-next');
        this.$flex1     = $('#lb-flex1');
        this.$flex2     = $('#lb-flex2');
        this.$image1    = $('#lb-image1');
        this.$image2    = $('#lb-image2');
        this.$lbElements = $('lb-overlay, #lb-nav, #lb-prev, #lb-next, #lb-flex1, #lb-flex2, #lb-image1, #lb-image2');

        // Adjust CSS depending on options
        this.$image1.css("max-width", this.options.max_width);
        this.$image1.css("max-height", this.options.max_height);
        this.$image2.css("max-width", this.options.max_width);
        this.$image2.css("max-height", this.options.max_height);

        // Attach event handlers to the newly minted DOM elements
        this.$overlay.on('click', () => {
            this.end();
            return false;
        });

        this.$prev.on('click', () => {
            if (this.currentImageIndex === 0) {
                this.changeImage(this.album.length - 1);
            } else {
                this.changeImage(this.currentImageIndex - 1);
            }
            return false;
        });

        this.$next.on('click', () => {
            if (this.currentImageIndex === this.album.length - 1) {
                this.changeImage(0);
            } else {
                this.changeImage(this.currentImageIndex + 1);
            }
            return false;
        });

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

        /*
        this.$loader.on('click', function() {
            self.end();
            return false;
        });
        */
    }; // end of build()

    // User has clicked on an element with 'data-lightbox'.
    // Show lightbox. If the image is part of a set, add siblings to album array.
    start ($lbelement) {
        // $lbelement is the thing clicked on -- typically a <figure> or <image>.
        var $window = $(window);

        // Apply user-supplied options 
        if (typeof lightboxSSAOptions == "object") {
            $.extend(this.options, lightboxSSAOptions);
        }

        this.build();
        this.$overlay.focus();
        this.showLightbox();

        this.album = [];
        var imageNumber = 0;

        const self = this;
        function addToAlbum ($lbelement) {
            const tag = $lbelement.prop("tagName");
            // Image can be from: -- searched in this order
            // - data-image
            // - <img>'s src
            // - <figure>'s (first) <img>'s src
            // - <a>'s <img>'s src
            var imageURL = $lbelement.attr('data-image');
            if (!imageURL) {
                if (tag == 'IMG') {
                    imageURL = $lbelement.attr('src');
                } else if (tag == 'FIGURE' || tag == 'A') {
                    let $imgs = $lbelement.find('img');
                    if ($imgs.length > 0) {
                        imageURL = $imgs.attr('src');
                    }
                }
            }
            if (!imageURL) {
                imageURL = 'missingImage.jpg';
            }
            console.log("imageURL: ", imageURL);
            // Link URL is from data-url or <fig>'s <img>'s data-url or <a>'s href
            // - <a>'s href - how to check if that is an image?
            var linkURL = $lbelement.attr('data-url');
            if (!linkURL) {
                if (tag == 'FIGURE') {
                    let $imgs = $lbelement.find('img');
                    if ($imgs.length > 0) {
                        linkURL = $imgs.attr('data-url');
                    }
                } else if (tag == 'A') {
                    linkURL = $lbelement.attr('href');
                }
            }
            // (no linkURL is OK)       
            console.log("adding image ", $lbelement, ", imageURL is ", imageURL, ", linkURL is ", linkURL);
            self.album.push({
                name:    imageURL,
                url:     linkURL,
                alt:     $lbelement.attr('data-alt'),
                title:   $lbelement.attr('data-title') || $lbelement.attr('title'),
                srclist: $lbelement.attr('data-imagelist'),
            });
        }

        var dataLightboxValue = $lbelement.attr('data-lightbox');    // dLV gets 'lightbox' or the name of the gallery
        var $lbelements;
        // Find all elements with the same gallery name
        $lbelements = $('[data-lightbox="' + dataLightboxValue + '"]');
        for (var i = 0; i < $lbelements.length; i += 1) {
            addToAlbum($($lbelements[i]));
            if ($lbelements[i] === $lbelement[0]) {
                imageNumber = i;
            }
        }

        this.albumLen = this.album.length;
        if (this.albumLen == 1) {
            // nowhere to navigate to
            this.$nav.hide();
        }
        if (this.albumLen == 2 && !this.options.wrap_around) {
            // TODO adjust arrows by hiding prev or next
        }
        this.$currentImage = this.$image1;
        this.$otherImage = this.$image2;
        this.changeImage(imageNumber);
    }; // end of start()

    // TODO need to know which way we're going to optimise loading of prev and next ?  FOR NOW rely on browser's cacheing, and just get prev and next the simple way
    // (depends on length of album)
    // Load the specified image as this.$otherImage, adjust its size, then call showImage() to swap images
    changeImage (imageNumber) {
        const self = this;
        const $image = this.$otherImage;

        // Disable keyboard nav during transitions
        this.disableKeyboardNav();

        function onLoad () {
            console.log("onLoad - src =", this.src);
            // 'this' is the new image  !!!!!!!! now == $image
            // 'self' is the lightbox object
            // '$image' is the DOM object (either lb-image1 or lb-image2)

            $image.attr({
                'alt': self.album[imageNumber].alt,
                'title': self.album[imageNumber].title,
                // 'src': this.src,
            });
            
            if (self.album[imageNumber].url) {
                $image.css("cursor", "pointer");
            } else {
                $image.css("cursor", "auto");
            }

            self.showImage();

            // not needed with .one    this.removeEventListener('load', onLoad);
        }; // end of onload function

        function onError () {
            // Expected image not found -- use placeholder
            console.log("onError - src =", this.src);
            // not needed with .one    this.removeEventListener('error', onError);
            this.src = self.placeholderImage;
        }

        $image.one('load', onLoad); // !! fires with 1x1 gif data?
        $image.one('error', onError);

        // Load the new image -- it will have opacity 0 at first
        $image.attr("src", this.album[imageNumber].name);
        this.currentImageIndex = imageNumber;   // FIXME is this the right place/time to update cII ?

    }; // end of changeImage()

    // Make the lightbox stuff visible
    showLightbox () {
        this.$overlay.fadeTo(this.options.fade_duration, this.options.overlay_opacity, ()=>{
            console.log("overlay fadeIn complete");
        });
    }

    // Display the image and its details and begin preload neighbouring images.
    // Fades out the current image, fades in the other one, then swaps the pointers.
    showImage () {  // (width, height) {
        //this.$loader.stop(true).hide();   // FIXME reinstate this
        // TODO ? also disable other clicks and keyboard events before the swap?
        // TODO ?? swap z-index values
        this.$currentImage.css({"pointer-events": "none"});
        // Don't forget: fadeOut adds 'display: none' at the end of the fade (aka .hide())
        //  (and fadeIn does the opposite)
        this.$currentImage.fadeOut(this.options.image_fade_duration);
        this.$otherImage.fadeIn(this.options.image_fade_duration+10, function() {
            // Swap the images
            const $temp = this.$otherImage;
            this.$otherImage = this.$currentImage;
            this.$currentImage = $temp;
            this.$currentImage.css({"pointer-events": "auto"});
            //this.updateNav();
            this.preloadNeighboringImages();
            this.enableKeyboardNav();  // FIXME move this start() or build() -- no, need to disable nav during changeImage 
        }.bind(this));
    };

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
        this.$overlay.on('keyup.keyboard', this.keyboardAction.bind(this));
        this.$overlay.on('keyup.keyboard', this.keyboardAction.bind(this));
    }

    disableKeyboardNav () {
        //this.$lightbox.off('.keyboard');
        this.$overlay.off('.keyboard');
    }

    keyboardAction (event) {
        const KEYCODE_ESC        = 27;
        const KEYCODE_LEFTARROW  = 37;
        const KEYCODE_RIGHTARROW = 39;

        let keycode = event.keyCode;
        if (keycode === KEYCODE_ESC) {
            // Prevent bubbling so as to not affect other components on the page.
            event.stopPropagation();
            this.end();
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

    // Closing time. :-(
    end () {
        this.$lbElements.fadeOut(this.options.fade_duration);
        //this.$lbElements.css({"display": "none"});
        if (this.options.disable_scrolling) {
            $('body').removeClass('lb-disable-scrolling');
        }
        this.$nav.remove();
        this.$flex1.remove();
        this.$flex2.remove();
        this.$overlay.remove();
    };

    } // end of class Lightbox

    return new LightboxSSA();
}));
