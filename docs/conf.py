project = "Face Rigging Studio"
author = "Face Rigging Studio contributors"
extensions = ["myst_parser", "sphinx.ext.githubpages"]
source_suffix = {".md": "markdown"}
root_doc = "index"
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]
myst_heading_anchors = 3
html_theme = "sphinx_rtd_theme"
html_title = "Face Rigging Studio documentation"
html_theme_options = {"navigation_depth": 3, "collapse_navigation": False}
html_static_path = ["_static"]
html_css_files = ["custom.css"]
html_show_sourcelink = False

html_show_copyright = False
