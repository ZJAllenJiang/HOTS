"""Build the original arena tower and export a self-contained glTF 2.0 asset.

blender -b --factory-startup --python tools/blender/arcane_tower.py -- public/models/arena/arcane-tower.glb
Pass an optional second output path ending in .blend to save the editable scene.
"""

import math
from pathlib import Path
import sys

import bpy


def material(name, color, metallic=0.0, roughness=0.76, emission=0.0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return result


def mesh(name, vertices, faces, surface):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    item = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(item)
    item.data.materials.append(surface)
    return item


def tier(name, profile, surface, sides=8, angle=math.pi / 8, x=0, y=0):
    """Join tapered polygon rings. Profile pairs are (height, radius)."""
    vertices = []
    for height, radius in profile:
        for side in range(sides):
            direction = angle + 2 * math.pi * side / sides
            vertices.append((x + radius * math.cos(direction), y + radius * math.sin(direction), height))
    faces = [tuple(reversed(range(sides)))]
    for lower in range(len(profile) - 1):
        for side in range(sides):
            a = lower * sides + side
            b = lower * sides + (side + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range(len(vertices) - sides, len(vertices))))
    return mesh(name, vertices, faces, surface)


def plate(name, profile, width, angle, surface):
    """Extrude a radial silhouette around the central stone body."""
    vertices = [
        (radius * math.cos(angle) - offset * math.sin(angle),
         radius * math.sin(angle) + offset * math.cos(angle), height)
        for offset in (-width / 2, width / 2) for radius, height in profile
    ]
    count = len(profile)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((j, i, i + count, j + count))
    item = mesh(name, vertices, faces, surface)
    # Make winding independent of how the silhouette was drawn.
    import bmesh
    edit = bmesh.new()
    edit.from_mesh(item.data)
    bmesh.ops.recalc_face_normals(edit, faces=edit.faces[:])
    edit.to_mesh(item.data)
    edit.free()
    return item


def combine(name, objects):
    """One exported mesh per surface keeps scene draw calls low."""
    bpy.ops.object.select_all(action='DESELECT')
    for item in objects:
        item.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = name
    return objects[0]


def create_tower():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    stone = material('Basalt', (0.078, 0.118, 0.15))
    edge = material('Cut Stone', (0.25, 0.32, 0.33))
    brass = material('Antique Brass', (0.56, 0.33, 0.105), 0.54, 0.4)
    inset = material('Obsidian Inlay', (0.022, 0.037, 0.05), 0.23)
    rune = material('Team Rune', (0.13, 0.62, 0.85), 0.19, 0.34, 0.8)
    crystal = material('Team Crystal', (0.24, 0.81, 1.0), 0.18, 0.27, 0.6)

    dark = [
        tier('Octagonal foot', [(0, 1.27), (.06, 1.38), (.22, 1.38), (.32, 1.25)], stone),
        tier('Main shaft', [(.4, .98), (.62, .94), (1.01, .73), (1.71, .65), (2.1, .83)], stone),
        tier('Crown shell', [(2.19, .85), (2.36, 1.09), (2.56, .91)], stone),
    ]
    edges = [
        tier('Plinth bevel', [(.28, 1.23), (.35, 1.27), (.42, 1.15), (.48, .98)], edge),
        tier('Upper bevel', [(1.96, .78), (2.06, .96), (2.16, .96), (2.23, .89)], edge),
    ]
    metals = [
        tier('Base rim', [(.49, 1.01), (.56, 1.01), (.59, .96)], brass),
        tier('Crown rim', [(2.24, .97), (2.31, 1.11), (2.39, 1.11), (2.43, 1.01)], brass),
        tier('Crystal socket', [(2.54, .57), (2.59, .62), (2.67, .54), (2.71, .43)], brass),
    ]
    inlays = [tier('Socket shadow', [(2.67, .44), (2.72, .42)], inset)]
    runes = []
    for i in range(4):
        corner = math.pi * i / 2 + math.pi / 4
        face = math.pi * i / 2
        edges.append(plate('Buttress', [(.56, .37), (1.21, .37), (1.16, .6), (.98, 1.03), (.77, 1.64), (.72, 1.99), (.55, 1.87)], .30, corner, edge))
        metals.append(plate('Crown prong', [(.71, 2.31), (1.03, 2.38), (.98, 2.72), (.67, 3.15), (.65, 2.91), (.79, 2.59)], .18, corner, brass))
        inlays.append(plate('Inset plaque', [(.60, .81), (.74, .88), (.74, 1.72), (.64, 1.91), (.60, 1.72)], .28, face, inset))
        runes.append(plate('Vertical rune', [(.747, 1.05), (.759, 1.10), (.759, 1.63), (.747, 1.69)], .065, face, rune))
        runes.append(plate('Prong light', [(.839, 2.60), (.851, 2.64), (.729, 2.88), (.709, 2.88)], .066, corner, rune))

    for name, objects in [('Stone', dark), ('StoneEdges', edges), ('Metalwork', metals), ('Inlays', inlays), ('Runes', runes)]:
        combine(name, objects)
    # Local origin at the crystal's center so gameplay rotation does not orbit the tower.
    crystal_parts = [tier('Main crystal', [(-.69, .015), (-.31, .37), (.28, .43), (.77, .015)], crystal, 6)]
    for i in range(3):
        angle = i * 2 * math.pi / 3
        crystal_parts.append(tier('Floating shard', [(-.38, .01), (-.22, .095), (.02, .10), (.23, .01)], crystal, 5,
                                  angle, .54 * math.cos(angle), .54 * math.sin(angle)))
    combine('Crystal', crystal_parts).location.z = 3.31


def main():
    arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(arguments) not in (1, 2):
        raise SystemExit('Expected a GLB path and optionally an editable .blend path.')
    output = Path(arguments[0]).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    create_tower()
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_animations=False,
                              export_texcoords=False, export_normals=True, export_yup=True)
    if len(arguments) == 2:
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(arguments[1]).resolve()))


if __name__ == '__main__':
    main()
