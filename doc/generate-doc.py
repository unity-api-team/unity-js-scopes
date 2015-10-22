#!/usr/bin/python3

# Copyright (C) 2015 Canonical Ltd.

# This library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation; either
# version 2.1 of the License, or (at your option) any later version.

# This library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Lesser General Public License for more details.

# You should have received a copy of the GNU Lesser General Public
# License along with this library; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
# MA  02110-1301  USA

import os
import subprocess
import sys
import shutil

def usage():
    print("generate-doc.py SOURCE_DIRECTORY TARGET_DOC_DIRECTORY")

if len(sys.argv) != 3:
    usage()
    sys.exit(1)

source_directory = sys.argv[1]
target_doc_directory = sys.argv[2]

current_folder = os.path.dirname(os.path.realpath(__file__))
if len(target_doc_directory) == 0:
    target_doc_directory = current_folder

yui_install = subprocess.check_output(['which', 'yuidoc'])

if len(yui_install) == 0:
    print("Please install yuidocjs: sudo apt-get \
    install npm nodejs-legacy && sudo npm -g install yuidocjs")
    sys.exit(1)

yuidoc_config = os.path.join(current_folder, 'yuidoc.json')

if not os.path.exists(yuidoc_config):
    print("Could not find the yui configuration file path")
    sys.exit(1)

def generate_js_file(filename):
    content = open(filename).read()
    if not str.find(content, '--doc:class'):
        return

    import re

    class_re = "doc:class\s([a-zA-Z]+)(.*)--/doc:class"
    r = re.search(class_re, content, re.MULTILINE|re.DOTALL)

    if not r:
        print("Skipping " + filename)
        return

    class_name = r.group(1).strip()
    class_doc = r.group(2).strip()

    js_file_content_template = """/**
 {}
 {}*/
function {}(){{}}

{}.prototype = {{
{}
}};
"""
    member_re = r"^--doc:member(.*?)--/doc:member"
    members = re.findall(member_re, content, re.MULTILINE|re.DOTALL)

    constructor_re = "doc:constructor(.*)--/doc:constructor"
    r = re.search(constructor_re, content, re.MULTILINE|re.DOTALL)
    constructor_doc = ''
    if r:
        constructor_doc = r.group(1).strip()

    js_file_content = js_file_content_template.format(
        class_doc,
        constructor_doc,
        class_name,
        class_name,
        ",\n".join(["/**\n" + member[:member.find('--doc:/member')].strip() + "\n*/\n" + member[member.find('--doc:/member')+len('--doc:/member'):].strip() for member in members])
        )

    path, name = os.path.split(filename)
    basename, ext = os.path.splitext(name)

    open(os.path.join(path, basename) + '.js', "w+").write(js_file_content)

def generate_js_files(source_folder):
    import glob
    header_file_pattern = os.path.join(source_folder, '*.h')
    header_files = glob.glob(header_file_pattern)
    for header_file in header_files:
        print('processing ' + header_file)
        f = os.path.join(source_folder, header_file)
        generate_js_file(f)

generate_js_files(source_directory)

yuidoc_command_line = 'yuidoc -o {} -c {} {}'.format(target_doc_directory, yuidoc_config, os.path.join(source_directory, ".."))
print(yuidoc_command_line)
result = subprocess.check_call(yuidoc_command_line.split(' '))

if result > 0:
    sys.exit(1)

def patch_yui_files_docs(doc_root_folder):
    header = """/**
 * Copyright (c) 2011, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * https://github.com/yui/yuidoc/blob/master/LICENSE
 */
"""

    yui_files = """
assets/js/yui-prettify.js
assets/js/api-list.js
assets/js/apidocs.js
assets/js/api-search.js
assets/js/api-filter.js
assets/vendor/prettify/prettify-min.js
api.js
"""
    for f in yui_files.split():
        fp = os.path.join(doc_root_folder, f)
        content = ''
        with open(fp) as o:
            content = o.read()
        with open(fp, "w+") as o:
            o.write(header + content)

patch_yui_files_docs(target_doc_directory)