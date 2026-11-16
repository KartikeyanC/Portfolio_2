HOW TO ADD PICTURES TO THE SITE
===============================

Drop a file into the right folder with the right name. That's it.
No code, no content.json edit. Save the file and refresh the page (Ctrl + Shift + R).

File types: .jpg, .png, .webp or .jpeg all work (the site tries them in that order).
Names must be lowercase and exact: cover.jpg, not Cover.JPG or cover (1).jpg.


PROJECTS  →  assets/images/projects/<project id>/
-----------------------------------------------------
Each project has its own folder. The folder name is the project's ID (see content.json or /gk).

  cover.jpg         The main picture: project card, Home, menu, work wall,
                    and the big header of the case study.
                    Best size: 1600 × 1000 px (landscape, 16:10), under 400 KB.

  cover@640.jpg …   Made automatically, don't edit: sharp, smaller copies of cover.*
  cover@2000.jpg    that the project cards load (a 3000–4000 px cover shrunk by the
                    browser into a small card looks blurry). They are remade whenever
                    cover.* changes while "python serve.py" runs, or by
                    "python build_single.py" (needs Pillow: pip install pillow).
                    Replaced cover.jpg without running either? Delete the cover@ files
                    (the cards then use cover.jpg) or run one of them.

  gallery/1.jpg     Extra pictures shown at the bottom of the case study,
  gallery/2.jpg     in number order. Keep numbering without gaps
  gallery/3.jpg …   (1, 2, 3 …) — the site stops at the first missing number.
                    Best size: 1600 px wide.

  Current folders:
    milton/            Milton e-commerce (cover already here)
    nexura/            Nexura logo & identity (cover already here)
    posters/           Posters page (posters.html): cover.jpg = the tilted poster wall;
                       NN-name.jpg = each poster at 3840 px (full-screen viewer),
                       NN-name@1200.jpg = the same poster for the wall. Both are
                       written into posters.html by name, so a new poster also
                       needs a line there.
                       WATERMARKED: don't put posters here yourself. Drop the clean
                       poster (NN-name.jpg) into _originals/posters/ at the top of the
                       project; the build (python build_single.py, or serve.py while it
                       runs) adds the faint K mark in the middle and writes both files
                       here. _originals/ stays on this computer (never uploaded).
    sample-brochure/   drop cover.jpg → replaces the drawn "Sample brochure" picture
    sample-deck/       drop cover.jpg → replaces the drawn "Sample company deck" picture
    sample-web/        drop cover.jpg → replaces the drawn "Sample landing page" picture

  New project? Add it in /gk first (its ID becomes the folder name), then create
  assets/images/projects/<that id>/ and put cover.jpg inside.

  When a sample becomes real work: also rename it in /gk and turn off
  "Sample (placeholder)" so the "Sample" tag goes away.


VIDEO WORK  →  assets/images/video/
-----------------------------------
Numbers follow the order of the items in /gk → Video work (1 = first item).

  thumbnails/1.jpg, 2.jpg …   YouTube thumbnails. Size: 1280 × 720 px (16:9).
  reels/1.mp4, 2.mp4 …        Reels & shorts as video (vertical 9:16, muted, short,
                              under ~8 MB each). Or reels/1.jpg as a still picture.
                              The .mp4 wins if both exist.
  podcasts/1.jpg, 2.jpg …     Podcast episode cover / frame. Size: 1280 × 720 px.
  showreel/poster.jpg         Picture shown on the Home showreel card before play.


PRIORITY (what wins)
--------------------
1. A picture / video chosen in /gk (those are saved in assets/uploads/).
2. Otherwise the file in these folders.
3. Otherwise the drawn placeholder.
So if a folder picture doesn't show, check that the Image field in /gk is empty.
