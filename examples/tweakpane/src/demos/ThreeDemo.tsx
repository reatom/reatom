import {
  action,
  atom,
  effect,
  peek,
  withConnectHook,
  wrap,
} from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'

import { reatomInstance, withInstance } from '../reatomInstance'
import { withEffect } from '../withEffect'
import { reatomPaneFolder, withBinding } from '../tweakpane'

export const ThreeDemo = reatomFactoryComponent(() => {
  const threeFolder = reatomPaneFolder({ title: 'Three.js' })

  const containerAtom = atom<HTMLElement | null>(
    null,
    'threeContainer',
  ).extend((target) => {
    const size = atom({ width: 0, height: 0 }, `${target.name}.size`).extend(
      withConnectHook((sizeTarget) =>
        effect(() => {
          const container = target()
          if (!container) return

          const updateSize = () => {
            sizeTarget.set({
              width: container.clientWidth,
              height: container.clientHeight,
            })
          }

          const observer = new ResizeObserver(wrap(updateSize))
          observer.observe(container)
          updateSize()

          return () => observer.disconnect()
        }),
      ),
    )

    return {
      size,
      ref: action(
        (node: HTMLElement | null) => void target.set(node),
        `${target.name}.ref`,
      ),
    }
  })

  const sceneAtom = reatomInstance(
    () => new Scene(),
    (scene) => scene.clear(),
  ).extend(
    () => ({
      bgColor: atom('#87ceeb', 'sceneColor').extend(
        withBinding({ label: 'Background Color' }, threeFolder),
      ),
    }),
    withEffect((scene) => {
      peek(scene).background = new Color(scene.bgColor())
    }),
  )

  const ambientLightAtom = reatomInstance(
    () => new AmbientLight(0xffffff, 0.5),
    (light) => light.removeFromParent(),
  ).extend(
    () => ({
      intensity: atom(0.5, 'ambientIntensity').extend(
        withBinding(
          { label: 'Ambient Intensity', min: 0, max: 2 },
          threeFolder,
        ),
      ),
    }),
    withEffect((light) => {
      peek(light).intensity = light.intensity()
    }),
  )

  const directionalLightAtom = reatomInstance(
    () => new DirectionalLight(0xffffff, 1),
    (light) => light.removeFromParent(),
  ).extend(
    () => ({
      intensity: atom(1, 'directionalIntensity').extend(
        withBinding(
          { label: 'Directional Intensity', min: 0, max: 2 },
          threeFolder,
        ),
      ),
      position: atom({ x: 5, y: 5, z: 5 }, 'directionalPosition').extend(
        withBinding({ label: 'Light Position' }, threeFolder),
      ),
    }),
    withEffect((light) => {
      peek(light).intensity = light.intensity()
    }),
    withEffect((light) => {
      const { x, y, z } = light.position()
      peek(light).position.set(x, y, z)
    }),
  )

  const cameraAtom = reatomInstance(
    () => new PerspectiveCamera(45, 1, 0.1, 100),
    (camera) => camera.removeFromParent(),
  ).extend(
    () => ({
      position: atom({ x: 0, y: 0, z: 10 }, 'cameraPosition').extend(
        withBinding({ label: 'Camera Position' }, threeFolder),
      ),
    }),
    withEffect((camera) => {
      const pos = camera.position()
      peek(camera).position.set(pos.x, pos.y, pos.z)
    }),
    withEffect((camera) => {
      const { width, height } = containerAtom.size()
      if (!width || !height) return
      peek(camera).aspect = width / height
      peek(camera).updateProjectionMatrix()
    }),
  )

  const rendererAtom = reatomInstance(
    () => {
      const renderer = new WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(1, 1)
      renderer.setAnimationLoop(
        wrap(() => {
          renderer.render(sceneAtom(), cameraAtom())
        }),
      )

      return renderer
    },
    (renderer) => {
      renderer.setAnimationLoop(null)
      renderer.dispose()
      renderer.domElement.remove()
    },
  ).extend(
    withEffect((renderer) => {
      const { width, height } = containerAtom.size()
      if (!width || !height) return
      peek(renderer).setSize(width, height)
    }),
    withEffect((renderer) => {
      const container = containerAtom()
      const element = peek(renderer).domElement
      if (container && element.parentElement !== container) {
        container.appendChild(element)
      }
    }),
  )

  const boxDimensionsAtom = atom({ x: 1, y: 1, z: 1 }, 'boxDimensions')
    .extend(withBinding({ label: 'Box Dimensions' }, threeFolder))
    .extend(
      withInstance(
        (dimensions) => {
          const { x, y, z } = dimensions()
          return new Mesh(
            new BoxGeometry(x, y, z),
            new MeshStandardMaterial({ color: 0x00ff00 }),
          )
        },
        (box) => {
          box.removeFromParent()
          box.geometry.dispose()
          if (Array.isArray(box.material)) {
            box.material.forEach((material) => material.dispose())
          } else {
            box.material.dispose()
          }
        },
      ),
    )

  boxDimensionsAtom.instance.extend(
    () => ({
      rotation: atom({ x: 0.5, y: 0.5, z: -0.3 }, 'boxRotation').extend(
        withBinding({ label: 'Box Rotation' }, threeFolder),
      ),
      color: atom('#00ff00', 'boxColor').extend(
        withBinding({ label: 'Box Color' }, threeFolder),
      ),
    }),
    withEffect((box) => {
      const { x, y, z } = box.rotation()
      peek(box).rotation.set(x, y, z)
    }),
    withEffect((box) => {
      const color = box.color()
      const material = peek(box).material
      const applyColor = (entry: MeshStandardMaterial) => {
        entry.color.set(color)
      }

      if (Array.isArray(material)) {
        material.forEach((entry) => applyColor(entry as MeshStandardMaterial))
      } else {
        applyColor(material as MeshStandardMaterial)
      }
    }),
  )

  effect(() => {
    const scene = sceneAtom()
    scene.add(ambientLightAtom())
    scene.add(directionalLightAtom())
    scene.add(boxDimensionsAtom.instance())
    rendererAtom()
  })

  return () => (
    <section>
      <h3>Three.js</h3>
      <p>
        Three.js scene wired to Tweakpane bindings. Adjust the controls to
        update the live WebGL view.
      </p>
      <div
        ref={wrap(containerAtom.ref)}
        style={{
          width: '100%',
          height: '360px',
          border: '1px solid #eee',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      />
    </section>
  )
}, 'ThreeDemo')
