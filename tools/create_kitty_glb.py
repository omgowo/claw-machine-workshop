import bpy
import os
import math


PROJECT_ROOT = r"C:\Users\ASUS\Desktop\claw-machine"
IMAGE_PATH = os.path.join(PROJECT_ROOT, "assets", "textures", "kitty-2.png")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "assets", "models", "formal", "kitty-2.glb")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def configure_transparency(material):
    material.use_nodes = True
    try:
        material.surface_render_method = "DITHERED"
    except AttributeError:
        material.blend_method = "BLEND"
        material.use_screen_refraction = False
    material.use_backface_culling = False


def create_material():
    image = bpy.data.images.load(IMAGE_PATH, check_existing=True)
    image.pack()

    material = bpy.data.materials.new("KittyTransparentMaterial")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"

    shader.inputs["Roughness"].default_value = 0.72
    shader.inputs["Specular IOR Level"].default_value = 0.2
    shader.inputs["Alpha"].default_value = 1.0
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])

    try:
        material.surface_render_method = "DITHERED"
    except AttributeError:
        material.blend_method = "BLEND"
        material.use_screen_refraction = False
    material.use_backface_culling = False
    return material, image


def create_mesh(material, image):
    aspect = image.size[0] / image.size[1]
    height = 1.0
    width = height * aspect
    depth = 0.025

    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.0, height * 0.5))
    obj = bpy.context.object
    obj.name = "KittyPrize"
    obj.dimensions = (width, depth, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False

    bevel = obj.modifiers.new("SoftEdges", "BEVEL")
    bevel.width = 0.012
    bevel.segments = 2

    return obj


def export_glb(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH,
        export_format="GLB",
        export_image_format="AUTO",
        export_materials="EXPORT",
        use_selection=True,
        export_apply=True,
    )


clear_scene()
material, image = create_material()
obj = create_mesh(material, image)
export_glb(obj)
print("Created:", OUTPUT_PATH)
