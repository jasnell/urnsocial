module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    distFolder: 'dist',
    srcFolder: 'src',
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> Author: James M Snell, License: Public Domain */\n'
      },
      build: {
        src: '<%= distFolder %>/<%= pkg.name %>.js',
        dest: '<%= distFolder %>/<%= pkg.name %>.min.js'
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          window: true,
          navigator: true,
          console: true
        }
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['<%= srcFolder %>/*.js'],
        dest: '<%= distFolder %>/<%= pkg.name %>.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Default task(s).
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('default', ['jshint','concat','uglify']);

};