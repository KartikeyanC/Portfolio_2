HOW TO ADD PICTURES TO THE SITE
===============================

Drop a file into the right folder with the right name. That's it.
No code, no content.json edit. Save the file and refresh the page (Ctrl + Shift + R).

The site uses WebP. You can also drop a .jpg or .png with the right name: python serve.py or
python build_single.py turns it into .webp and keeps the original in _originals/site-images/.
Names must be lowercase and exact: cover.webp, not Cover.WEBP or cover (1).webp.


PROJECTS  →  assets/images/projects/<project id>/
-----------------------------------------------------
Each project has its own folder. The folder name is the project's ID (see content.json or /gk).

  cover.webp         The main picture: project card, Home, menu, work wall,
                    and the big header of the case study.
                    Best size: 1600 × 1000 px (landscape, 16:10), under 400 KB.

  cover@640.webp …   Made automatically, don't edit: sharp, smaller copies of cover.*
  cover@2000.webp    that the project cards load (a 3000–4000 px cover shrunk by the
                    browser into a small card looks blurry). They are remade whenever
                    cover.* changes while "python serve.py" runs, or by
                    "python build_single.py" (needs Pillow: pip install pillow).
                    Replaced cover.webp without running either? Delete the cover@ files
                    (the cards then use cover.webp) or run one of them.

  gallery/1.webp     Extra pictures shown at the bottom of the case study,
  gallery/2.webp     in number order. Keep numbering without gaps
  gallery/3.webp …   (1, 2, 3 …) — the site stops at the first missing number.
                    Best size: 1600 px wide.

  Current folders:
    milton/            Milton e-commerce (cover already here)
    nexura/            Nexura logo & identity (cover already here)
    posters/           Posters page (posters.html): cover.webp = the tilted poster wall;
                       NN-name.webp = each poster at 3840 px (full-screen viewer),
                       NN-name@1200.webp = the same poster for the wall. Both are
                       written into posters.html by name, so a new poster also
                       needs a line there.
                       WATERMARKED: don't put posters here yourself. Drop the clean
                       poster (NN-name.jpg) into _originals/posters/ at the top of the
                       project; the build (python build_single.py, or serve.py while it
                       runs) adds the faint K mark in the middle and writes both files
                       here. _originals/ stays on this computer (never uploaded).
    sample-brochure/   drop cover.webp → replaces the drawn "Sample brochure" picture
    sample-deck/       drop cover.webp → replaces the drawn "Sample company deck" picture
    sample-web/        drop cover.webp → replaces the drawn "Sample landing page" picture

  New project? Add it in /gk first (its ID becomes the folder name), then create
  assets/images/projects/<that id>/ and put cover.webp inside.

  When a sample becomes real work: also rename it in /gk and turn off
  "Sample (placeholder)" so the "Sample" tag goes away.


VIDEO WORK  →  assets/images/video/
-----------------------------------
Numbers follow the order of the items in /gk → Video work (1 = first item).

  thumbnails/1.webp, 2.webp …   YouTube thumbnails. Size: 1280 × 720 px (16:9).
  reels/1.mp4, 2.mp4 …        Reels & shorts as video (vertical 9:16, muted, short,
                              under ~8 MB each). Or reels/1.webp as a still picture.
                              The .mp4 wins if both exist.
  podcasts/1.webp, 2.webp …     Podcast episode cover / frame. Size: 1280 × 720 px.
  showreel/poster.webp         Picture shown on the Home showreel card before play.


PRIORITY (what wins)
--------------------
1. A picture / video chosen in /gk (those are saved in assets/uploads/).
2. Otherwise the file in these folders.
3. Otherwise the drawn placeholder.
So if a folder picture doesn't show, check that the Image field in /gk is empty.
