//
// Lightbox v2.11.1
// by Lokesh Dhakar
// Modified by Chris Dennis...
// - changed DOM -- simplified, data-lightbox now works on any element, not just <a>, I use <figure>
// - fancy cursors indicate where prev/next clickable areas are -- now outside the image
// - added link-through for clicking on the image.
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
// - it's a class, but use of # implies only one...
// - need to images to blend between them?
// - swiping

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

    class Lightbox {

    // Descriptions of all options available on the demo site:
    // http://lokeshdhakar.com/projects/lightbox2/index.html#options
    defaults = {
        albumLabel: 'Image %1 of %2',
        showImageNumberLabel: false,    // TODO not reimplemented
        alwaysShowNavOnTouchDevices: false,
        fadeDuration: 600,
        fitImagesInViewport: true,
        imageFadeDuration: 600,
        // maxWidth: 800,   // TODO get rid of these, or use maxSize and keep aspect ratio
        // maxHeight: 600,
        verticalMargin: 50,    // pixels needed for arithmetic  "5vh", 
        resizeDuration: 700,
        wrapAround: false,
        disableScrolling: true, // false,  ??
        // Sanitize Title
        // If the caption data is trusted, for example you are hardcoding it in, then leave this to false.
        // This will free you to add html tags, such as links, in the caption.
        // If the caption data is user submitted or from some other untrusted source, then set this to true
        // to prevent xss and other injection attacks.
        sanitizeTitle: false,
        minArrowWidth: 32, // Space for arrow *outside* the image area
    };

    options = {};

    constructor (options) {
        this.album = [];
        this.currentImageIndex = void 0;
        this.init();
        // options
        this.options = $.extend({}, this.defaults);
        this.option(options);
    }

    option (options) {
        $.extend(this.options, options);
    };

    imageCountLabel (currentImageNum, totalImages) {
        return this.options.albumLabel.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
    };

    init () {
        var self = this;
        // Both enable and build methods require the body tag to be in the DOM.
        $(document).ready(function() {
            self.enable();
            self.build();
        });
    };

    // Loop through anchors and areamaps looking for data-lightbox attributes
    // that contain 'lightbox'. When these are clicked, start lightbox.
    enable () {
        var self = this;
        //$('body').on('click', 'figure[data-lightbox], area[data-lightbox]', function(event) {
        $('body').on('click', '[data-lightbox]', function(event) {
            self.start($(event.currentTarget));
            return false;
        });
    };

    // Build html for the lightbox and the overlay.
    // Attach event handlers to the new DOM elements. click click click
    // NOTE This happens when page is loaded, NOT when an image is clicked.
    build () {
        if ($('#lightbox').length > 0) {
            return;
        }

        var self = this;

        // The two root nodes generated, #lightboxOverlay and #lightbox are given
        // tabindex attrs so they are focusable. We attach our keyboard event
        // listeners to these two elements, and not the document. Clicking anywhere
        // while Lightbox is opened will keep the focus on or inside one of these
        // two elements.
        //
        // We do this so we can prevent propogation of the Esc keypress when
        // Lightbox is open. This prevents it from intefering with other components
        // on the page below.
        //
        const html = `
            <div id="lb-overlay" tabindex="-1" class="lb-overlay"><!-- full width and height, grey background, click on it to close -->
                    <div id="lb-container" class="lb-container"><!-- full width -->
                            <div id="lb-prev" class="lb-prev" aria-label="Previous image"></div>
                            <div id=lb-imagewrapper class="lb-image-wrapper">
                                <!-- This is where to add <a> but only if there's a data-lightbox2-link -->
                                <!-- GIF causes flash? -->
                                <img id=lb-image class="lb-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" alt=""/><!-- temp 1x1 gif -->
                            </div>
                            <div id=lb-next class="lb-next" aria-label="Next image"></div>
                        </div>
                        <div class="lb-loader" id=lb-loader>
                            <a class="lb-cancel"></a>
                        </div>
                    </div>
                    <div class="lb-dataContainer"><!-- maybe later -->
                        <div class="lb-data">
                            <div class="lb-details">
                                <span class="lb-caption"></span>
                                <span class="lb-number"></span>
                            </div>
                        </div>
                    </div>
            </div>
        `;
        $(html).appendTo($('body'));

        // Cache jQuery objects
        //this.$lightbox       = $('#lightbox');
        this.$overlay        = $('#lb-overlay');
        //this.$outerContainer = this.$lightbox.find('.lb-outerContainer');
        this.$container      = $('#lb-container');  //this.$lightbox.find('.lb-container');
        this.$wrapper        = $('#lb-imagewrapper');
        this.$image          = $('#lb-image');  //this.$lightbox.find('.lb-image');
        this.$loader         = $('#lb-loader');
        //this.$nav            = this.$lightbox.find('.lb-nav');
        this.$prev = $('#lb-prev');
        this.$next = $('#lb-next');

        // Store css values for future lookup
        // (use parseInt to get rid of trailing 'px')
        this.containerPadding = {
            top:    parseInt(this.$container.css('padding-top'), 10),
            right:  parseInt(this.$container.css('padding-right'), 10),
            bottom: parseInt(this.$container.css('padding-bottom'), 10),
            left:   parseInt(this.$container.css('padding-left'), 10)
        };

        this.imageBorderWidth = {
            top:    parseInt(this.$image.css('border-top-width'), 10),
            right:  parseInt(this.$image.css('border-right-width'), 10),
            bottom: parseInt(this.$image.css('border-bottom-width'), 10),
            left:   parseInt(this.$image.css('border-left-width'), 10)
        };

        // Attach event handlers to the newly minted DOM elements
        this.$overlay.hide().on('click', function() {
            self.end();
            return false;
        });

        /*
        this.$lightbox.hide().on('click', function(event) {
            if ($(event.target).attr('id') === 'lightbox') {
                self.end();
            }
        });
        */

        this.$container.on('click', function(event) {
            if ($(event.target).attr('id') === 'lb-container') {
                self.end();
            }
            return false;
        });

        //this.$overlay.find('.lb-prev').on('click', function() {
        this.$prev.on('click', function() {
            if (self.currentImageIndex === 0) {
                self.changeImage(self.album.length - 1);
            } else {
                self.changeImage(self.currentImageIndex - 1);
            }
            return false;
        });

        //this.$overlay.find('.lb-next').on('click', function() {
        this.$next.on('click', function() {
            if (self.currentImageIndex === self.album.length - 1) {
                self.changeImage(0);
            } else {
                self.changeImage(self.currentImageIndex + 1);
            }
            return false;
        });

        this.$image.on('click', function(event) {
            // self.currentImageIndex is evaluated at click time, so gives the correct URL.
            if (self.album[self.currentImageIndex].url) {
                // Jump to the given URL
                window.location = self.album[self.currentImageIndex].url;
            }
            return false;
        });

        // Show context menu for image on right-click
        // There is a div containing the navigation that spans the entire image and lives above of it. If
        // you right-click, you are right clicking this div and not the image. This prevents users from
        // saving the image or using other context menu actions with the image.
        // To fix this, when we detect the right mouse button is pressed down, but not yet clicked, we
        // set pointer-events to none on the nav div. This is so that the upcoming right-click event on
        // the next mouseup will bubble down to the image. Once the right-click/contextmenu event occurs
        // we set the pointer events back to auto for the nav div so it can capture hover and left-click
        // events as usual.
        // TODO  maybe don't need this
        /*
        this.$nav.on('mousedown', function(event) {
            if (event.which === 3) {
                self.$nav.css('pointer-events', 'none');

                self.$overlay.one('contextmenu', function() {
                    setTimeout(function() {
                        this.$nav.css('pointer-events', 'auto');
                    }.bind(self), 0);
                });
            }
        });
        */

        this.$loader.on('click', function() {
            self.end();
            return false;
        });
    };

    // User has clicked on an element with 'data-lightbox'.
    // Show overlay and lightbox. If the image is part of a set, add siblings to album array.
    start ($lbelement) {
        // $lbelement is the thing clicked on -- typically a <figure> or <image>.
        var self    = this;
        var $window = $(window);

        //$window.on('resize', $.proxy(this.sizeOverlay, this));
        $window.on('resize', this.sizeOverlay.bind(this));

        this.sizeOverlay();

        this.album = [];
        var imageNumber = 0;

        function addToAlbum ($lbelement) {
            self.album.push({
                alt: $lbelement.attr('data-alt'),
                name: $lbelement.attr('data-image'),   // FIXME or from the image within the fig
                title: $lbelement.attr('data-title') || $lbelement.attr('title'),
                url: $lbelement.attr('data-url'),
                srclist: $lbelement.attr('data-imagelist'),
            });
        }

        var dataLightboxValue = $lbelement.attr('data-lightbox');    // dLV gets 'lightbox' (or the name of the gallery)
        var $lbelements;
        // Find all elements with the same gallery name
        $lbelements = $('[data-lightbox="' + dataLightboxValue + '"]');
        for (var i = 0; i < $lbelements.length; i += 1) {
            addToAlbum($($lbelements[i]));
            if ($lbelements[i] === $lbelement[0]) {
                imageNumber = i;
            }
        }

        // Disable scrolling of the page while open
        if (this.options.disableScrolling) {
            $('body').addClass('lb-disable-scrolling');
        }

        this.changeImage(imageNumber);
    };

    // Hide most UI elements in preparation for the animated resizing of the lightbox.
    changeImage (imageNumber) {
        var self = this;
        var filename = this.album[imageNumber].name;
        console.log("changeImage: imageNumber=%d filename=%s", imageNumber, filename);
        var filetype = filename.split('.').slice(-1)[0];
        var $image = this.$image;   // this.$overlay.find('.lb-image');   // FIXME already have this.$image defined

        // Disable keyboard nav during transitions
        this.disableKeyboardNav();

        // Show loading state
        //this.$overlay.fadeIn(this.options.fadeDuration);
        // fade from none to flex -- from https://stackoverflow.com/questions/28904698/how-fade-in-a-flex-box
        // later in changeImage()
        this.$overlay.css("display", "flex").hide().fadeIn(this.options.fadeDuration);
        this.$loader.fadeIn('slow');
        //this.$overlay.find('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-dataContainer, .lb-numbers, .lb-caption').hide();
        // TODO use ids:
        this.$overlay.find('.lb-image, .lb-prev, .lb-next, .lb-dataContainer, .lb-numbers, .lb-caption').hide();
        this.$container.addClass('animating'); // NEEDED? FIXME

        // When image to show is preloaded, we send the width and height to sizeContainer()
        var preloader = new Image();
        preloader.onload = function() {
            var $preloader;
            var imageHeight;
            var imageWidth;
            var maxImageHeight;
            var maxImageWidth;
            var windowHeight;
            var windowWidth;

            $image.attr({
                'alt': self.album[imageNumber].alt,
                'title': self.album[imageNumber].title,
                'src': filename,
            });

            $preloader = $(preloader);

            $image.width(preloader.width);
            $image.height(preloader.height);
            windowWidth = $(window).width();
            windowHeight = $(window).height();

            // Calculate the max image dimensions for the current viewport.
            // Take into account the border around the image and an additional 10px gutter on each side.
            // CD added minArrowWidth
            // New plan  'minArrowWidth' is whole block between left/right edge of image and edge of viewport
            maxImageWidth  = windowWidth - 
                self.containerPadding.left - self.containerPadding.right - 
                self.imageBorderWidth.left - self.imageBorderWidth.right - 
                /*20 -*/ self.options.minArrowWidth*2;
            maxImageHeight = windowHeight - 
                self.containerPadding.top - self.containerPadding.bottom - 
                self.imageBorderWidth.top - self.imageBorderWidth.bottom - 
                self.options.verticalMargin * 2; // - 70;
            // above line -- without the -70 is fine for landscape, not room at the bottom for portrait

            // SVGs that don't have width and height attributes specified are reporting width and height
            // values of 0 in Firefox 47 and IE11 on Windows. To fix, we set the width and height to the max
            // dimensions for the viewport rather than 0 x 0.
            // https://github.com/lokesh/lightbox2/issues/552

            if (filetype === 'svg') {
                if ((preloader.width === 0) || preloader.height === 0) {
                    $image.width(maxImageWidth);
                    $image.height(maxImageHeight);
                }
            }

            // Fit image inside the viewport.
            if (self.options.fitImagesInViewport) {
                // Check if image size is larger then maxWidth|maxHeight in settings
                if (self.options.maxWidth && self.options.maxWidth < maxImageWidth) {
                    maxImageWidth = self.options.maxWidth;
                }
                if (self.options.maxHeight && self.options.maxHeight < maxImageHeight) {
                    maxImageHeight = self.options.maxHeight;
                }
            } else {
                maxImageWidth = self.options.maxWidth || preloader.width || maxImageWidth;
                maxImageHeight = self.options.maxHeight || preloader.height || maxImageHeight;
            }

            // Is the current image's width or height is greater than the maxImageWidth or maxImageHeight
            // option than we need to size down while maintaining the aspect ratio.
            if ((preloader.width > maxImageWidth) || (preloader.height > maxImageHeight)) {
                const widthFactor = preloader.width / maxImageWidth;
                const heightFactor = preloader.height / maxImageHeight;
                //if ((preloader.width / maxImageWidth) > (preloader.height / maxImageHeight)) {
                if (widthFactor > heightFactor) {
                    imageWidth  = maxImageWidth;
                    // CD imageHeight = parseInt(preloader.height / (preloader.width / imageWidth), 10);
                    imageHeight = Math.round(preloader.height / widthFactor);
                    $image.width(imageWidth);
                    $image.height(imageHeight);
                } else {
                    imageHeight = maxImageHeight;
                    //imageWidth = parseInt(preloader.width / (preloader.height / imageHeight), 10);
                    imageWidth = Math.round(preloader.width / heightFactor);
                    $image.width(imageWidth);
                    $image.height(imageHeight);
                }
            }
            self.sizeContainer($image.width(), $image.height());
            
            if (self.album[imageNumber].url) {
                $image.css("cursor", "pointer");
            } else {
                $image.css("cursor", "auto");
            }
        };

        // Preload image before showing
        preloader.src = this.album[imageNumber].name;
        this.currentImageIndex = imageNumber;

    }; // end of changeImage()

    // Stretch overlay to fit the viewport
    // FIXME this is called on window resize and lots of other places
        // -- need to change it to resize the new container/image etc.
    sizeOverlay () {
        return; // CD not needed
        var self = this;
        // We use a setTimeout 0 to pause JS execution and let the rendering catch-up.
        // Why do this? If the `disableScrolling` option is set to true, a class is added to the body
        // tag that disables scrolling and hides the scrollbar. We want to make sure the scrollbar is
        // hidden before we measure the document width, as the presence of the scrollbar will affect the
        // number.
        setTimeout(function() {
            self.$overlay
                .width($(document).width())
                .height($(document).height());
                // CD These don't work -- don't get the lightbox when image is clicked
                //.width("100vw")
                //.height("100vh"));
        }, 0);
    };

    // Animate the size of the lightbox to fit the image we are showing
    // This method also shows the the image.
    sizeContainer (imageWidth, imageHeight) {
        const self = this;
        const oldWidth  = this.$wrapper.outerWidth();  // FIXME these are 0
        const oldHeight = this.$wrapper.outerHeight();
        const newWidth  = imageWidth +
            this.containerPadding.left + this.containerPadding.right + // FIXME not containerPadding?
            this.imageBorderWidth.left + this.imageBorderWidth.right; 
            //this.options.minArrowWidth*2;   // CD...  FIXME   rename minArrowWidth to minNavWidth or something
        const newHeight = imageHeight + 
            this.containerPadding.top + this.containerPadding.bottom + 
            this.imageBorderWidth.top + this.imageBorderWidth.bottom;
        const windowWidth = $(window).width();
        const lbPrevWidth = Math.round((windowWidth - newWidth) / 2);
        const lbNextWidth = windowWidth - newWidth - lbPrevWidth;

        function postResize() {
            //self.$overlay.find('.lb-dataContainer').width(newWidth);
            self.$prev.width(lbPrevWidth).height(newHeight/2);  // Just use the middle part of the sides of the screen for prev/next clicking
            self.$wrapper.width(newWidth).height(newHeight);
            self.$next.width(lbNextWidth).height(newHeight/2);
            //self.$overlay.find('.lb-prev').width(lbPrevWidth).height(newHeight);
            //self.$overlay.find('.lb-next').width(lbNextWidth).height(newHeight);
            // Set focus on one of the two root nodes so keyboard events are captured.
            self.$overlay.focus();
            self.showImage();
        }

        //if (oldWidth !== newWidth || oldHeight !== newHeight) {
        if (oldHeight !== newHeight) {
            this.$container.animate({
                //width: newWidth,
                height: newHeight
            }, this.options.resizeDuration, 'swing', postResize);
        } else {
            postResize();
        }
    };

    // Display the image and its details and begin preload neighboring images.
    showImage () {
        this.$loader.stop(true).hide();
        this.$image.fadeIn(this.options.imageFadeDuration);
        this.updateNav();
        this.updateDetails();
        this.preloadNeighboringImages();
        this.enableKeyboardNav();
    };

    // Display previous and next navigation if appropriate.
    updateNav () {
        // Check to see if the browser supports touch events. If so, we take the conservative approach
        // and assume that mouse hover events are not supported and always show prev/next navigation
        // arrows in image sets.
        var alwaysShowNav = false;
        try {
            document.createEvent('TouchEvent');
            alwaysShowNav = this.options.alwaysShowNavOnTouchDevices;   //) ? true : false;
        } catch (e) {}

        // ???? this.$overlay.find('.lb-nav').show();

        // FIXME sort out arrow opacity -- is it still needed? yes, does .show() among other things.
        if (this.album.length > 1) {
            if (this.options.wrapAround) {
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

    // Display caption, image number, and closing button.
    updateDetails () {
        var self = this;

        // Enable anchor clicks in the injected caption html.
        // Thanks Nate Wright for the fix. @https://github.com/NateWr
        if (typeof this.album[this.currentImageIndex].title !== 'undefined' &&
            this.album[this.currentImageIndex].title !== '') {
            var $caption = this.$overlay.find('.lb-caption');
            if (this.options.sanitizeTitle) {
                $caption.text(this.album[this.currentImageIndex].title);
            } else {
                $caption.html(this.album[this.currentImageIndex].title);
            }
            $caption.fadeIn('fast');
        }

        if (this.album.length > 1 && this.options.showImageNumberLabel) {
            var labelText = this.imageCountLabel(this.currentImageIndex + 1, this.album.length);
            this.$overlay.find('.lb-number').text(labelText).fadeIn('fast');
        } else {
            this.$overlay.find('.lb-number').hide();
        }

        this.$container.removeClass('animating');

        this.$overlay.find('.lb-dataContainer').fadeIn(this.options.resizeDuration, function() {
            return self.sizeOverlay();
        });
    };

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

    enableKeyboardNav () {
        this.$overlay.on('keyup.keyboard', $.proxy(this.keyboardAction, this));
        this.$overlay.on('keyup.keyboard', $.proxy(this.keyboardAction, this));
    }

    disableKeyboardNav () {
        this.$overlay.off('.keyboard');
        this.$overlay.off('.keyboard');
    };

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
            } else if (this.options.wrapAround && this.album.length > 1) {
                this.changeImage(this.album.length - 1);
            }
        } else if (keycode === KEYCODE_RIGHTARROW) {
            if (this.currentImageIndex !== this.album.length - 1) {
                this.changeImage(this.currentImageIndex + 1);
            } else if (this.options.wrapAround && this.album.length > 1) {
                this.changeImage(0);
            }
        }
    };

    // Closing time. :-(
    end () {
        this.disableKeyboardNav();
        $(window).off('resize', this.sizeOverlay);
        this.$overlay.fadeOut(this.options.fadeDuration);
        this.$overlay.fadeOut(this.options.fadeDuration);
        if (this.options.disableScrolling) {
            $('body').removeClass('lb-disable-scrolling');
        }
    };

    } // end of class Lightbox

    return new Lightbox();
}));
