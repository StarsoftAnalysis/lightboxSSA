build: 
	# copy things into the examples directory
	mkdir -p examples/css examples/images examples/js
	cp -a src/images/* examples/images/
	cp -a src/js/lightboxSSA.js examples/js/lightboxSSA.js
	sassc --sass src/css/lightboxSSA.scss examples/css/lightboxSSA.css
