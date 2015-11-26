// todo
// - css & js minifier + sourcemaps
// - automated release with gulp-git

// note: the current file is not watched nor linted

'use strict';
 
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var browsersync = require('browser-sync');
var nodemon = require('gulp-nodemon');
var sass = require('gulp-sass');
var cache = require('gulp-cached');


// linting
// this task is ran at launch (on all files) and on changed files
gulp.task('lint', function() {
	gulp.src(['*.js', 'public/*.js', '!./gulpfile.js'])
	.pipe(cache('linting'))
	.pipe(jshint())
	.pipe(jshint.reporter('jshint-stylish'));
});

// launch nodemon
gulp.task('nodemon', function() {
	nodemon({
		ignore: ['public/*', './gulpfile.js'],
		ext: 'js json'
	});
});

// launch browser-sync & watch public files for change
gulp.task('browser-sync', function() {

	browsersync({
		proxy: "http://localhost:8080",
        files: ["public/**/*.*"],
        port: 8000,
	});

	gulp.watch(['public/{*.js,*.css,*.html}'], browsersync.reload);
});

// compile scss to css
gulp.task('compile-css', function() {
	gulp.src(['public/sass/*.scss'])
	.pipe(sass().on('error', sass.logError))
	.pipe(gulp.dest('public/'));

});

// entry point
gulp.task('default', ['lint', 'nodemon', 'browser-sync'], function() {

	// add a watch for css compiling
	gulp.watch('public/sass/*.scss',['compile-css']);

	// add a watch for js linting
	gulp.watch(['*.js', 'public/*.js'], ['lint']);

});