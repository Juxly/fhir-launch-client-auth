var minify = require('gulp-minify')
var gulp = require('gulp')
gulp.task('compress', function () {
    gulp.src('fhir-client-launch-auth.js')
    .pipe(minify())
    .pipe(gulp.dest('./'))
});
