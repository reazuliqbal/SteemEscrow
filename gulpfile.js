'use strict';

var gulp            = require('gulp');
var gutil           = require('gulp-util');
var sass            = require('gulp-sass');
var sourcemaps      = require('gulp-sourcemaps');
var autoprefixer    = require('gulp-autoprefixer');
var cssnano         = require('gulp-cssnano');
var concat          = require('gulp-concat');
var rename          = require('gulp-rename');
var uglify          = require('gulp-uglify');
var plumber         = require('gulp-plumber');
var browserSync     = require('browser-sync').create();

gulp.task('styles', function () {
    return gulp.src('src/scss/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: [
                'Android 2.3',
                'Android >= 4',
                'Chrome >= 20',
                'Firefox >= 24',
                'Explorer >= 8',
                'iOS >= 6',
                'Opera >= 12',
                'Safari >= 6'
            ],
            cascade: false
        }))
        .pipe(sourcemaps.write('./'))

        .pipe(gulp.dest('css'))
        .pipe(browserSync.stream());
});

gulp.task('scripts', function() {
    return gulp.src('src/js/*.js')
        .pipe(plumber())
        .pipe(concat('app.js'))
        .pipe(gulp.dest('js'))
        .pipe(rename('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('js'))
        .pipe(plumber.stop())
        .pipe(browserSync.stream());
});

gulp.task('serve', ['styles', 'scripts'], function() {

    browserSync.init({
        server: {
            baseDir: "./"
        },
        injectchanges: true
    });

    gulp.watch("src/scss/**/*.scss", ['styles']);
    gulp.watch("src/js/*.js", ['scripts']);
    gulp.watch("*.html").on('change', browserSync.reload);
});

gulp.task('default', ['serve']);
