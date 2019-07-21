"use strict";

const gulp = require("gulp");
const sass = require("gulp-sass");
const browserSync = require("browser-sync").create();
const concat = require("gulp-concat");
const rev = require("gulp-rev");
const revRewrite = require("gulp-rev-rewrite");
const babel = require("gulp-babel");
const del = require("del");
const autoprefixer = require("autoprefixer");
const sourcemaps = require("gulp-sourcemaps");
const uglify = require("gulp-uglify");
const pump = require("pump");
const cleanCSS = require("gulp-clean-css");
const imagemin = require("gulp-imagemin");
const cache = require("gulp-cache");
const postcss = require('gulp-postcss');
const serveIp = "192.168.56.101";
const serveDir = "./static";

//task names
const taskClean = "clean";
const taskCleanHtml = "clean-html";
const taskCleanBuild = "clean-build";
const taskCleanFonts = "clean-fonts";
const taskBundleJs = "bundle-js";
const taskBuild = "build";
const taskBuildCompress = "build-compress";
const taskBuildAll = "build-all";
const taskBuildHtml = "build-html";
const taskBuildJs = "build-js";
const taskBuildSass = "build-sass";
const taskCompressJs = "compress-js";
const taskDefault = "default";
const taskDeleteAssets = "delete-assets";
const taskHash = "hash";
const taskVendorJs = "vendor-js";
const taskWatch = "watch";
const taskUpdate = "update";
const taskServe = "serve";
const taskLiveReload = 'live-reload';
const taskOptimiseImages = 'optimise-img';


sass.compiler = require("node-sass");

var sassSrc = "./resources/sass/main.scss",
    sassFiles = "./resources/sass/**",
    imgSrc = "./resources/assets/**/",
    htmlSrc = "./resources/*.html",
    jsSrc = "./resources/js/*.js",
    fontSrc = "./resources/fonts/*",
    dist = "./static",
    htmlDist = "./static/*.html",
    assets = './static/assets',
    jquery = "./node_modules/jquery/dist/jquery.min.js",
    popperjs = "./node_modules/popper.js/dist/popper.min.js",
    bootstrap = "./node_modules/bootstrap/dist/js/bootstrap.min.js",
    build = "./static/build/",
    tmp = build + "temp/",
    tmpJs = tmp + "js",
    tmpCss = tmp + "css"
;

//versioning on build files
gulp.task("hash", function() {
    return gulp
        .src([tmp + "**/*.js", tmp + "**/*.css"])
        .pipe(rev())
        .pipe(gulp.dest(dist))
        .pipe(rev.manifest())
        .pipe(gulp.dest(assets));
});


// clean the last build completely
gulp.task("clean", function() {
    return del([dist]);
    done();
});


gulp.task(
    "clean-build",
    gulp.series(
        taskHash,
        done => {
            return del([build]);
            done();
        }
    )
);

// delete assets except js and css files
gulp.task("delete-assets", () => {
    return del([assets + "/*", "!./dist/assets/rev-manifest.json"]);
});

gulp.task(
    "clean-fonts",
    function(){
        return del([build + '/fonts/**'])
});

// clean html files
gulp.task("clean-html", done => {
    del.sync([dist + "/*.html"]);
    done();
});

gulp.task(
    "build-js",
    () => {
        return gulp
            .src(jsSrc)
            .pipe(
                babel({
                    presets: ["@babel/env"]
                })
            )
            .pipe(concat("main.js"))
            .pipe(gulp.dest(build));
    }
);

gulp.task("vendor-js", done => {
    return gulp
        .src([jquery, popperjs, bootstrap])
        .pipe(concat("vendor-bundle.js"))
        .pipe(gulp.dest(build));
    done();
});

gulp.task(
    "bundle-js",
    gulp.series(
        gulp.parallel(taskVendorJs, taskBuildJs),
        done => {
            return gulp
                .src([jsSrc])
                .pipe(sourcemaps.init())
                .pipe(concat("bundle.js"))
                .pipe(sourcemaps.write())
                .pipe(gulp.dest(tmpJs));
            done();
        }
    )
);

gulp.task(
    "compress-js",
    gulp.series(taskBundleJs, function(cb) {
        pump([gulp.src(tmp + "**/*.js"), uglify(), gulp.dest(tmp)], cb);
    })
);

// images optimising
gulp.task("optimise-img", () => {
    return gulp
        .src(imgSrc + "*.+(png|jpg|jpeg|gif|svg)")
        // .pipe(
        //     cache(
        //         imagemin({
        //             interlaced: true
        //         })
        //     )
        // )
        .pipe(gulp.dest(assets));
});

gulp.task("build-html",
    gulp.series(function(done) {
        return gulp.src(htmlSrc).pipe(gulp.dest(dist));
        done();
    })
);

gulp.task(
    "copy-fonts",
    gulp.series("clean-fonts", function(done) {
        return gulp
            .src(fontSrc)
            .pipe(gulp.dest(dist + '/fonts/'));
        done();
    })
);

gulp.task(
    "build-sass",
    () => {
        return gulp
            .src(sassSrc)
            .pipe(sourcemaps.init())
            .pipe(sass().on("error", sass.logError))
            .pipe(concat("style.css"))
            .pipe(sourcemaps.write())
            .pipe(cleanCSS({ compatibility: "ie8"}))
            .pipe(gulp.dest(tmpCss))
            .pipe(browserSync.stream());
    }
);

gulp.task(
    "build-all",
    gulp.parallel(
        taskBuildHtml,
        taskBuildSass,
        taskBundleJs,
        taskOptimiseImages
    )
);

gulp.task(
    "update",
    gulp.series(
        "clean-build",
        function(done) {
            const manifest = gulp.src(assets + "/rev-manifest.json", {"allowEmpty": true});
            return gulp
                .src(htmlDist)
                .pipe(revRewrite({manifest}))
                .pipe(gulp.dest(dist));
            done();
        }
    )
);


gulp.task(
    "watch",
    function(done) {
        gulp.watch(sassFiles, gulp.series(taskLiveReload));
        gulp.watch(jsSrc, gulp.series(taskLiveReload));
        gulp.watch(htmlSrc).on(
            "change",
            gulp.series(
                taskClean,
                taskBuildAll,
                taskUpdate,
                done => {
                    browserSync.reload();
                    done();
                }
            )
        );
        done();
    }
);

gulp.task(
    "serve",
    gulp.parallel(taskWatch, () => {
        browserSync.init({
            server: {
                baseDir: './static/'
            },
            host: serveIp
        });
    })
);

gulp.task(
    "live-reload",
    gulp.series(
        taskClean,
        taskBuildAll,
        taskUpdate,
        function(done) {
            browserSync.reload();
            done();
    })
);

// build and minify
gulp.task(
    "build-compress",
    gulp.parallel("build-html", "build-sass", "compress-js", "optimise-img", "copy-fonts")
);

// build for production
gulp.task(
    "build",
    gulp.series(
        taskClean,
        taskBuildCompress,
        taskUpdate
    )
);

// build and serve
gulp.task(
    "default",
    gulp.series(
        taskClean,
        taskBuildAll,
        taskUpdate,
        taskServe
    )
);
