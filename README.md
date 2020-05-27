# LightboxSSA

This is yet another fork of 
[Lokesh Dhakar](http://www.lokeshdhakar.com)'s excellent [Lightbox2](https://github.com/lokesh/lightbox2).

I'm making various modifications, so this version isn't really ready for use yet.

LightboxSSA is small Javascript module used to overlay images on top of the current page for viewing as a lightbox.


## Major changes from Lightbox2

* User can click/touch on images to link to a page with more information, or any other URL.
* Use flex and CSS to reduce the need to do image size calculations in Javascript,
  and make the whole thing much more responsive.
* Replaced arrow images with dynamic cursors.  Cursors don't show in phones or other
  touch screens, but phone users can guess that swiping should be possible, so:
* Added swiping for touch screens.
* Uses 'proper' Javascript classes.
* No more jQuery.  And it's no longer a module.

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

* overlay_opacity: 0.9,
* etc. TODO

## Hugo

LightboxSSA can be used with Hugo.  

...how to put JS and CSS in assets, and then do the stuff in `<head>`  TODO

To include the JS and CSS for LightboxSSA on a page, add this to the frontmatter:

```yaml
---
...
lightboxSSA: true
---
```

If you want to adjust any options, use something like this:

```yaml
---
...
lightboxSSA: 
    overlay_opacity: 0.9
    wrap_around: true
---
```

---

### Local development

I don't use things like Bower or Grunt, so there are just SCSS and JS files for people to use as they wish.

### Licence

This project is licensed under the terms of the GNU Public Licence version 3.0.  Please see
the file 'COPYING' for details.

