from setuptools import setup
import setup_translate

pkg = 'Extensions.AutoTimer'
setup(name='enigma2-plugin-extensions-autotimer',
       version='3.0',
       description='Automatically add Timers based on simple rules',
       package_dir={pkg: 'AutoTimer'},
       packages=[pkg],
       package_data={pkg: ['images/*.png', '*.png', '*.xml', 'locale/*/LC_MESSAGES/*.mo', 'faq.xml', 'mphelp.xml', 'plugin.png', 'autotimerwizard.xml', 'maintainer.info', 'LICENSE', 'web/*.xml', 'web-data/*.js', 'web-data/*.htm', 'web-data/*.html', 'web-data/*.png', 'web-data/*.css']},
       cmdclass=setup_translate.cmdclass,  # for translation
      )
