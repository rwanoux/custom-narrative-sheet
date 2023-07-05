'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
var browserSync = require('browser-sync').create();

function buildStyles() {
	return gulp.src('./custom-narrative-sheet.scss')
		.pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
		.pipe(gulp.dest('./'))
		.pipe(browserSync.stream());


};
function reloadTemplates() {
	return () => {
		browserSync.reload("templates/**/*.html");
		browserSync.reload("templates/**/*.hbs");

	}
}
exports.buildStyles = buildStyles;
exports.watch = function () {
	browserSync.init(
		{
			server: false,
			proxy: {
				target: "https://localhost:443/",
				ws: true,
			}

		}
	);

	gulp.watch(['./scss/**/*.scss', './*.scss'], buildStyles);

};
