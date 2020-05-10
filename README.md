# LightboxSSA

This is yet another fork of Lokesh Dhakar's excellent lightbox2.

I'm making various modifications, so this version isn't really ready for use yet.

Lightbox is small javascript library used to overlay images on top of the current page. It's a snap to setup and works on all modern browsers.

Lokesh's documentation is here:

- **Demos and usage instructions.** Visit the [Lightbox homepage](http://lokeshdhakar.com/projects/lightbox2/) to see examples, info on getting started, script options, how to get help, and more.
- **Releases and Changelog**. Viewable on the [Github Releases page](https://github.com/lokesh/lightbox2/releases)
- **Roadmap.** View the [Roadmap](https://github.com/lokesh/lightbox2/blob/master/ROADMAP.md) for a peek at what is being planned for future releases.
- **License.** Lightbox is licensed under the MIT License. [Learn more about the license.](http://lokeshdhakar.com/projects/lightbox2/#license)

by [Lokesh Dhakar](http://www.lokeshdhakar.com)

---

## Options

The appearance of the lightbox can be tuned with a number of parameters, set via a Javascript object.  Include something
like this in the HTML, either in the <head> or at the end of the <body>.

	const lightboxSSA = {
		vertical_margin: 50,
		wrap_around: false,
	};

The settable options are:

* vertical_margin [pixels]  default: 50
* etc. TODO

## Hugo

LightboxSSA can be used with Hugo.  

...how to put JS and CSS in assets, and then do the stuff in <head>  TODO

To include the JS and CSS for LightboxSSA on a page, add this to the frontmatter:

	lightboxSSA: true

If you want to adjust any options, use something like this:

	lightboxSSA: 
		vertical_margin: 20
		wrap_around: true


---

### Local development

I don't use things like Bower or Grunt, so there are just SCSS and JS files for people to use as they wish.
