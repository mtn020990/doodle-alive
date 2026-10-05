"""Run one AnimatedDrawings job in its own process, so each render gets a fresh OpenGL context.

Usage (cwd = the AnimatedDrawings repo):
    python render_job.py <image> <out_dir> <motion> <retarget>
Writes <out_dir>/video.gif. Same steps as the repo's examples/image_to_animation.py,
plus `view: USE_MESA: True` for headless rendering. With the four_legs retarget, the
detected (human) skeleton is first converted to an animal one by the repo's
examples/quadruped/human_to_animal.py, as its README describes.
"""
import sys
from pathlib import Path

import yaml

sys.path.insert(0, "examples")
from image_to_annotations import image_to_annotations  # noqa: E402

import animated_drawings.render  # noqa: E402

image_path, out_dir, motion, retarget = sys.argv[1:5]
image_to_annotations(image_path, out_dir)

out = Path(out_dir).resolve()
character_cfg = out / "char_cfg.yaml"
if retarget == "four_legs":
    sys.path.insert(0, "examples/quadruped")
    from human_to_animal import write_animal_config  # noqa: E402

    write_animal_config(str(character_cfg))  # writes animal_config.yaml next to it
    character_cfg = out / "animal_config.yaml"

mvc_cfg = {
    "scene": {"ANIMATED_CHARACTERS": [{
        "character_cfg": str(character_cfg),
        "motion_cfg": str(Path(f"examples/config/motion/{motion}.yaml").resolve()),
        "retarget_cfg": str(Path(f"examples/config/retarget/{retarget}.yaml").resolve()),
    }]},
    "controller": {"MODE": "video_render", "OUTPUT_VIDEO_PATH": str(out / "video.gif")},
    "view": {"USE_MESA": True},
}
cfg_path = out / "mvc_cfg.yaml"
cfg_path.write_text(yaml.dump(mvc_cfg))
animated_drawings.render.start(str(cfg_path))
