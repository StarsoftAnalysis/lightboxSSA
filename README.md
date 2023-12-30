# LightboxSSA

LightboxSSA is small Javascript program, with some CSS, that can be used to overlay images on top of the current page for viewing as a lightbox.

This repository is arranged so that it can be used as a [Hugo](https://gohugo.io/) [module](https://gohugo.io/hugo-modules/use-modules/), but the components can be used on non-Hugo sites too.

This is yet another fork of 
[Lokesh Dhakar](http://www.lokeshdhakar.com)'s excellent [Lightbox2](https://github.com/lokesh/lightbox2).

## Major changes from Lightbox2

* The user can click/touch on images to link to a page with more information, or any other URL.
* Uses CSS's [flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) feature to reduce the need to do image size calculations in Javascript,
  and make the whole thing much more responsive.
* Will use an image's srcset attribute if available.
* Replaced arrow images with dynamic cursors.  Cursors don't show in phones or other
  touch screens, but phone users can guess that swiping should be possible, so:
* Added swiping for touch screens.
* Uses 'proper' Javascript ES6 classes.
* No more jQuery.  And it's no longer a Javascript module, but it is a Hugo module.
* Designed to work with Hugo's [`{{<figset>}}` and `{{<figrow>}}` shortcodes](https://github.com/StarsoftAnalysis/figset).

---

## Installation

The CSS component of lightboxSSA is written in SASS, but the distribution includes the compiled CSS in the `examples` folder
if required.

Include the Javascript and SASS/CSS in the usual way, keeping the `images` directory in the same
place relative to the `js` and `css` directories, because the Javascript and CSS both use relative URLs to find the 
dynamic cursor images.

### Hugo

LightboxSSA can be used with Hugo (version 0.114 or later), either as a module or a theme.

Needs Dart SASS -- use option `transpiler: dartsass`.

You ust need to include something like
'''
{{ partial "lightboxSSA.html" . }}
'''
in your `partials/head.html` or equivalent.
That will put the JS and CSS on pages
that have `lightboxssa: active: true` in their frontmatter.

To include lightboxSSA JS and CSS on every page,
put
`lightboxSSA: active: true`
(with other options if required, see below)
in the site's configuration file (config|hugo.yaml|toml) 
within the `params` section.

If you want to adjust any options for the whole site, use something like this:
```yaml
# config.yaml
...
params:
    lightboxSSA: 
        active: true
        overlay_opacity: 0.9
        wrap_around: true
```

## Usage

## Options

The appearance of the lightbox can be tuned with a number of parameters, set via a Javascript object.  Include something
like this in the HTML, either in the `<head>` or at the end of the `<body>`.

```javascript
const lightboxSSA = {
    overlay_opacity: 0.9,
	wrap_around: false,
};
```

The settable options are:

* `disable_scrolling`: Hide the scrollbar so that lightbox uses full area of the window. true/false  Default: true
* `fade_duration`: The time in ms to fade from one image to the next.  Default: 600
* `max_height`: The maximum height of the image, as a percentage of the screen width. 10 - 100 Default: 95%
* `max_width`: The maximum width of the image, as a percentage of the screen width. 10 - 100  Default: 95%
* `overlay_opacity`: The opacity of the overlay that is displayed behind the lightbox image.  Valid values are between 0.00 (clear) and 1.0 (completely opaque).  Default: 1.0
* `overlay_colour`: The colour of the overlay, expressed in any CSS colour format, such as `#aa22ff` or `rgb(30,100,2200`)
* `swipe_min`: The minimum distance for a swipe gesture to be accepted, as a fraction of the screen size.  0.0 - 1.0  Default: 0.1
* `wrap_around`: Whether or not the gallery feature will wrap around at each end. true/false  Default: true
* `active`: For Hugo sites only.  Set this to `true` to include the lightboxSSA javascript and CSS on the page (or on all pages if
the setting is in the site's configuration file).  true/false  Default: false

### Using Hugo shortcodes

lightboxSSA can be used with the `{{<figure>}}`, but note that it uses `title=...` to create an `h4` element within the `<figcaption>`, and follows it
with the contents of the `caption=` attribute, rather than using `title` as a tooltip for the image as you might expect.

The [`{{<figset>}}` and `{{<figrow>}}` shortcodes](https://github.com/StarsoftAnalysis/figset) were designed to work together with lightboxSSA, and do a better job.

Note that with Hugo's `figure` shortcode, `data-lightbox` doesn't get passed on to the HTML `<figure>` element; so use `class="lightbox-..."`.
Or use the `figset` shortcode.

### Attaching a lightbox to an HTML element

A lightbox can be attached to any element, but only makes sense for an `<img>` or for a `<figure>` that contains an `<img>`.

The link from the figure or image to the lightbox is achieved in one of two ways: with a `data-lightbox` attribute, or by
applying a `lightbox-...` class.  For example:

```html
<img data-lightbox=img1 src="thingy.png">
```
or
```html
<img class="lightbox-img1" src="thingy.png">
```

The value of the `data-lightbox=...`/`class=lightbox-...` attribute (aka the gallery name) is used to group images into galleries.  Use a unique attribute,
or no attribute, to create a lightbox for a single image with no gallery.

If you mix  `data-lightbox=...`/`class=lightbox-...` attributes with the same gallery name, the order of the images in the gallery won't be 
in DOM order, so do one or the other.

### Details 
The lightbox will take details (caption, title, alt text, etc.) from the img or the figure, or both.  If the lightbox is attached
to a `<figure>`, it will look for details in the enclosed `<img>` first, and then from the figure element.  If the lightbox is attached
to an `<img>`, it will NOT look at any enclosing `<figure>`.

To make it more complicated, there are two ways of supplying some of these details: with `data-...` attributes, or with the usual
`figcaption`, `title`, and `alt` attributes.  `data-...` attributes take precedence.  The reason for this is to allow
the details on the lightbox to be different from those on the main page.  

The details that can be set are:

* **image name**: `src=...` -- in the `img`'s src attribute.  The name (URL) of the image, e.g. `/images/photo1.png`, or `https://example.com/remote.jpg`.
* **link URL**: `data-url=...` -- an URL to link to when the user clicks on the image from within the lightbox.
* **title**: `data-title=...` or `title=...` -- The title, used as a tooltip when the mouse pointer is over the image.
* **alt**: `data-alt=...` or `alt=...` -- The [alt text](https://en.wikipedia.org/wiki/Alt_attribute) for the image.
* **caption**: `data-caption=...` or `<figcaption>...</figcaption>` -- The caption to display with the image.  If the image is part
of a `<figure>`, the `figcaption` text will be used, unless overridden by `data-title` in the image or figure elements. 
* **srcset**: 'data-srcset=...' or 'srcset=...' -- The [`srcset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/srcset) to use with the image.
Note that `data-sizes` is not needed: lightboxSSA will calculate calculate a suitable `sizes` value for use within the lightbox.  


Examples:
```html
<figure data-lightbox="example-2" data-caption="A different caption for the light box" data-title="Lightbox-only title">
    <img src="/photos/pic2.jpg" width=300 alt="Looking down at a calm sea from the top of a chalk cliff">
    <figcaption>A cliff, can't remember where</figcaption>
</figure>
```

Use title= for tooltip on main page, will also be tooltip on lightbox; data-title= will only show up on lightbox (overriding title=).
Likewise for caption and data-caption.
And alt.
This is complicated -- see addToAlbum()   FIXME   e.g. if there's a figure with an image, either may have the title or data-title 
Rule: data- attributes take precedence -- they can override those without data- because they are unique to the lightbox, 
e.g. '<img data-title=x title=y ... >  uses y on the main page, x on the lightbox.

### Known Issues

* If lightbox elements share a gallery name but use a mixture of `class=lightbox-...` and `data-lightbox=...`, the order
  of the images in the gallery may not match the order on the main screen.

### Local development

I don't use things like Bower or Grunt, so there are just SCSS and JS files for people to use as they wish.

### Licence

This project is licensed under the terms of the GNU Public Licence version 3.0.  Please see
the file 'LICENSE.txt' for details.

