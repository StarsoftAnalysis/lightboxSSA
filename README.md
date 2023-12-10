# LightboxSSA


LightboxSSA is small Javascript program, with some CSS, that can be used to overlay images on top of the current page for viewing as a lightbox.

This is yet another fork of 
[Lokesh Dhakar](http://www.lokeshdhakar.com)'s excellent [Lightbox2](https://github.com/lokesh/lightbox2).

This repository is arranged so that it can be used as a Hugo module.

## Major changes from Lightbox2

* User can click/touch on images to link to a page with more information, or any other URL.
* Use flex and CSS to reduce the need to do image size calculations in Javascript,
  and make the whole thing much more responsive.
* Replaced arrow images with dynamic cursors.  Cursors don't show in phones or other
  touch screens, but phone users can guess that swiping should be possible, so:
* Added swiping for touch screens.
* Uses 'proper' Javascript classes.
* No more jQuery.  And it's no longer a Javascript module, but it is a Hugo module.

## Requirements

* ES6 (but you can transpile to more widely compatible versions of Javascript if required).

---

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
* `swipe_min`: The minimum distance for a swipe gesture to be accepted, as a fraction of the screen size.  0.0 - 1.0  Default: 0.1
* `wrap_around`: Whether or not the gallery feature will wrap around at each end. true/false  Default: true
* `active`: For Hugo sites only.  Set this to `true` to include the lightboxSSA javascript and CSS on the page (or on all pages if
the setting is in the site's configuration file).  true/false  Default: false

## Installation

Depends if you use SASS...   Include the Javascript and CSS in the usual way, keeping the `images` directory in the same
place relative to the `js` and `css` directories, because the Javascript and CSS both use relative URLs to find the images.

### Hugo

LightboxSSA can be used with Hugo.  

...now as a module.
Just need to include something like
'''{{ partial "lightboxSSA.html" . }}'''
in your `partials/head.html` or equivalent.
-- that will put the JS and CSS on every page
that has `lightboxssa: ...` in its frontmatter.

Put
```lightboxSSA: true```
(with options if required, see below)
in config.yaml within params (or the .toml version)
to include lbSSA CSS and JS on every page. 
(unless it active:false).
If you want to adjust any options, use something like this:

```yaml
---
...
lightboxSSA: 
    active: true
    overlay_opacity: 0.9
    wrap_around: true
---
```

---

### Local development

I don't use things like Bower or Grunt, so there are just SCSS and JS files for people to use as they wish.

### Licence

This project is licensed under the terms of the GNU Public Licence version 3.0.  Please see
the file 'LICENSE.txt' for details.

