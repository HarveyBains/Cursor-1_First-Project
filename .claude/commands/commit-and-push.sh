#!/bin/bash

read -p "Enter a commit message: " msg

git add .
git commit -m "$msg"
git push 