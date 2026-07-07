# Mineflayer 对外接口文档 (Public API Reference)

> 本文档记录 mineflayer v4.37.1 所有对外接口、作用、实现方式及源码地址。

---

## 一、模块级导出 (Module Exports)

源码: [lib/loader.js](mineflayer/lib/loader.js)

| 导出项 | 类型 | 作用 | 实现方式 |
|---|---|---|---|
| `createBot(options)` | 函数 | 创建并返回一个 Minecraft 机器人实例 | 工厂函数，内部创建 EventEmitter，加载插件系统，创建 minecraft-protocol 客户端 |
| `Location` | 类 | 将绝对坐标转换为区块内相对坐标 | 见下方 Location 章节 |
| `Painting` | 类 | 表示游戏中的画 | 简单数据类 |
| `ScoreBoard` | 类 | 表示记分板 | 见下方 ScoreBoard 章节 |
| `BossBar` | 类 | 表示 Boss 血条 | 见下方 BossBar 章节 |
| `Particle` | 类 | 表示粒子效果 | 见下方 Particle 章节 |
| `latestSupportedVersion` | string | 最新支持的 Minecraft 版本 ("26.2") | 取自 [lib/version.js](mineflayer/lib/version.js) 数组末尾 |
| `oldestSupportedVersion` | string | 最早支持的 Minecraft 版本 ("1.8.8") | 取自 [lib/version.js](mineflayer/lib/version.js) 数组开头 |
| `testedVersions` | string[] | 所有经过测试的 28 个版本 | [lib/version.js](mineflayer/lib/version.js) |
| `supportFeature(feature, version)` | 函数 | 检查指定版本是否支持某特性 | 调用 minecraft-data 的 supportFeature |

---

## 二、Bot 对象属性 (Bot Properties)

> 所有属性由 `createBot()` 返回的 bot 对象直接暴露。大部分属性由各插件注入，源码位于 [lib/plugins/](mineflayer/lib/plugins/)。

### 2.1 基础身份信息

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.username` | string | 机器人的玩家名 | loader.js 初始化 |
| `bot.version` | string | 当前 Minecraft 版本号 (如 "1.20.4") | loader.js 在连接后设置 |
| `bot.protocolVersion` | number | 协议版本号 | loader.js 在连接后设置 |
| `bot.majorVersion` | string | 主版本号 | loader.js 在连接后设置 |
| `bot._client` | Client | 底层 minecraft-protocol 客户端实例 | loader.js 创建 |
| `bot.registry` | Registry | prismarine-registry 实例（版本数据注册表） | loader.js 初始化 |

### 2.2 玩家自身状态

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.entity` | Entity | 机器人自身的实体对象 | [physics.js](mineflayer/lib/plugins/physics.js) 注入 |
| `bot.health` | number | 当前生命值 (0-20) | [health.js](mineflayer/lib/plugins/health.js) 注入 |
| `bot.food` | number | 当前饥饿值 (0-20) | [health.js](mineflayer/lib/plugins/health.js) 注入 |
| `bot.foodSaturation` | number | 当前饱食度 | [health.js](mineflayer/lib/plugins/health.js) 注入 |
| `bot.oxygenLevel` | number | 当前氧气值 | [breath.js](mineflayer/lib/plugins/breath.js) 注入 |
| `bot.experience` | Experience | 经验值对象 `{level, points, progress}` | [experience.js](mineflayer/lib/plugins/experience.js) 注入 |
| `bot.isAlive` | boolean | 是否存活 (插件内部使用) | [health.js](mineflayer/lib/plugins/health.js) 注入 |
| `bot.isSleeping` | boolean | 是否在睡觉 | [bed.js](mineflayer/lib/plugins/bed.js) 注入 |
| `bot.spawnPoint` | Vec3 | 出生点坐标 | [spawn_point.js](mineflayer/lib/plugins/spawn_point.js) 注入 |
| `bot.usingHeldItem` | boolean | 是否正在使用手中物品 (如吃东西/拉弓) | [physics.js](mineflayer/lib/plugins/physics.js) 注入 |
| `bot.heldItem` | Item \| null | 当前手持的物品 | [inventory.js](mineflayer/lib/plugins/inventory.js) 注入 |
| `bot.quickBarSlot` | number | 当前快捷栏槽位 (0-8) | [inventory.js](mineflayer/lib/plugins/inventory.js) 注入 |
| `bot.fireworkRocketDuration` | number | 烟花火箭剩余飞行时间 | [physics.js](mineflayer/lib/plugins/physics.js) 注入 |

### 2.3 世界与环境

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.game` | GameState | 游戏状态 `{levelType, gameMode, hardcore, dimension, difficulty, maxPlayers, serverBrand}` | [game.js](mineflayer/lib/plugins/game.js) 注入 |
| `bot.world` | world.WorldSync | 世界/区块数据（同步访问） | blocks.js 注入 |
| `bot.time` | Time | 时间对象 `{doDaylightCycle, bigTime, time, timeOfDay, day, isDay, moonPhase, bigAge, age}` | [time.js](mineflayer/lib/plugins/time.js) 注入 |
| `bot.isRaining` | boolean | 是否在下雨 | [rain.js](mineflayer/lib/plugins/rain.js) 注入 |
| `bot.thunderState` | number | 雷暴状态 (0=无, 1=雷暴) | [rain.js](mineflayer/lib/plugins/rain.js) 注入 |
| `bot.physicsEnabled` | boolean | 是否启用物理引擎 | physics.js / loader.js 设置 |

### 2.4 实体与玩家

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.entities` | {[id: string]: Entity} | 所有已知实体 (key 为实体 ID) | [entities.js](mineflayer/lib/plugins/entities.js) 注入 |
| `bot.players` | {[username: string]: Player} | 所有在线玩家 | [entities.js](mineflayer/lib/plugins/entities.js) 注入 |
| `bot.player` | Player | 机器人自身的 Player 对象 | [entities.js](mineflayer/lib/plugins/entities.js) 注入 |

### 2.5 背包与容器

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.inventory` | Window | 机器人自身的背包窗口 | [inventory.js](mineflayer/lib/plugins/inventory.js) 注入 |
| `bot.currentWindow` | Window \| null | 当前打开的容器窗口 (箱子/熔炉等) | [chest.js](mineflayer/lib/plugins/chest.js) 注入 |
| `bot.targetDigBlock` | Block | 当前正在挖掘的方块 | [digging.js](mineflayer/lib/plugins/digging.js) 注入 |

### 2.6 控制状态与设置

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.controlState` | ControlStateStatus | 当前移动控制状态 `{forward, back, left, right, jump, sprint, sneak}` | [physics.js](mineflayer/lib/plugins/physics.js) 注入 |
| `bot.settings` | GameSettings | 客户端设置 `{chat, colorsEnabled, viewDistance, difficulty, skinParts, mainHand}` | [settings.js](mineflayer/lib/plugins/settings.js) 注入 |
| `bot.chatPatterns` | ChatPattern[] | 当前注册的聊天匹配模式 | [chat.js](mineflayer/lib/plugins/chat.js) 注入 |
| `bot.physics` | PhysicsOptions | 物理参数配置 | [physics.js](mineflayer/lib/plugins/physics.js) 注入 |

### 2.7 记分板与队伍

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.scoreboards` | {[name: string]: ScoreBoard} | 所有记分板 (name → ScoreBoard) | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) 注入 |
| `bot.scoreboard` | {[slot: string]: ScoreBoard} | 按显示槽位的记分板 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) 注入 |
| `bot.teams` | {[name: string]: Team} | 所有队伍 | [team.js](mineflayer/lib/plugins/team.js) 注入 |
| `bot.teamMap` | {[name: string]: Team} | 按成员名索引的队伍映射 | [team.js](mineflayer/lib/plugins/team.js) 注入 |

### 2.8 创造模式

| 属性 | 类型 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.creative` | creativeMethods | 创造模式专属方法集 `{setInventorySlot, clearSlot, clearInventory, flyTo, startFlying, stopFlying}` | [creative.js](mineflayer/lib/plugins/creative.js) 注入 |

---

## 三、Bot 对象方法 (Bot Methods)

### 3.1 生命周期与连接

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.connect(options)` | `(options: BotOptions) => void` | 连接到新服务器 | loader.js |
| `bot.end(reason?)` | `(reason?: string) => void` | 断开连接 | loader.js (代理到 `_client.end()`) |
| `bot.quit(reason?)` | `(reason?: string) => void` | 同 end，断开连接 | [kick.js](mineflayer/lib/plugins/kick.js) 注入 |

### 3.2 世界与方块查询

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.blockAt(point, extraInfos?)` | `(point: Vec3, extraInfos?: boolean) => Block \| null` | 获取指定坐标的方块 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.blockInSight(maxSteps, vectorLength)` | `(maxSteps: number, vectorLength: number) => Block \| null` | 获取视线方向上的方块 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.blockAtCursor(maxDistance?, matcher?)` | `(maxDistance?, matcher?) => Block \| null` | 获取光标指向的方块 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.blockAtEntityCursor(entity?, maxDistance?, matcher?)` | `(entity?, maxDistance?, matcher?) => Block \| null` | 获取实体视线方向的方块 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.canSeeBlock(block)` | `(block: Block) => boolean` | 判断方块是否在视线内 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.findBlock(options)` | `(options: FindBlockOptions) => Block \| null` | 查找匹配条件的最近方块 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.findBlocks(options)` | `(options: FindBlockOptions) => Vec3[]` | 查找所有匹配条件的方块坐标 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `bot.waitForChunksToLoad()` | `() => Promise<void>` | 等待周围区块加载完成 | [blocks.js](mineflayer/lib/plugins/blocks.js) |

### 3.3 实体查询

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.entityAtCursor(maxDistance?)` | `(maxDistance?: number) => Entity \| null` | 获取视线方向上的实体 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `bot.nearestEntity(filter?)` | `(filter?: (entity: Entity) => boolean) => Entity \| null` | 获取最近的匹配实体 | [entities.js](mineflayer/lib/plugins/entities.js) |

### 3.4 移动与物理

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.setControlState(control, state)` | `(control: ControlState, state: boolean) => void` | 设置移动控制状态 (forward/back/left/right/jump/sprint/sneak) | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.getControlState(control)` | `(control: ControlState) => boolean` | 获取指定的移动控制状态 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.clearControlStates()` | `() => void` | 清除所有移动控制状态 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.lookAt(point, force?)` | `(point: Vec3, force?: boolean) => Promise<void>` | 看向指定坐标 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.look(yaw, pitch, force?)` | `(yaw: number, pitch: number, force?: boolean) => Promise<void>` | 设置朝向 (偏航角/俯仰角，单位弧度) | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.elytraFly()` | `() => Promise<void>` | 开始鞘翅飞行 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.waitForTicks(ticks)` | `(ticks: number) => Promise<void>` | 等待指定 tick 数 | [physics.js](mineflayer/lib/plugins/physics.js) |

### 3.5 骑乘

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.mount(entity)` | `(entity: Entity) => void` | 骑乘实体 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.dismount()` | `() => void` | 离开骑乘 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.moveVehicle(left, forward)` | `(left: number, forward: number) => void` | 控制载具移动 | [physics.js](mineflayer/lib/plugins/physics.js) |

### 3.6 挖掘与建造

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.dig(block, forceLook?, digFace?)` | `(block: Block, forceLook?: boolean \| 'ignore', digFace?: 'auto' \| Vec3 \| 'raycast') => Promise<void>` | 挖掘方块 | [digging.js](mineflayer/lib/plugins/digging.js) |
| `bot.stopDigging()` | `() => void` | 停止挖掘 | [digging.js](mineflayer/lib/plugins/digging.js) |
| `bot.digTime(block)` | `(block: Block) => number` | 计算挖掘方块所需时间 (ms) | [digging.js](mineflayer/lib/plugins/digging.js) |
| `bot.canDigBlock(block)` | `(block: Block) => boolean` | 判断是否可以挖掘该方块 | [digging.js](mineflayer/lib/plugins/digging.js) |
| `bot.placeBlock(referenceBlock, faceVector)` | `(referenceBlock: Block, faceVector: Vec3) => Promise<void>` | 放置方块 | [place_block.js](mineflayer/lib/plugins/place_block.js) |
| `bot.placeEntity(referenceBlock, faceVector)` | `(referenceBlock: Block, faceVector: Vec3) => Promise<Entity>` | 放置实体 (船/矿车等) | [place_entity.js](mineflayer/lib/plugins/place_entity.js) |
| `bot.activateBlock(block, direction?, cursorPos?)` | `(block: Block, direction?: Vec3, cursorPos?: Vec3) => Promise<void>` | 激活方块 (按钮/拉杆/门等) | [block_actions.js](mineflayer/lib/plugins/block_actions.js) |
| `bot.activateEntity(entity)` | `(entity: Entity) => Promise<void>` | 与实体交互 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `bot.activateEntityAt(entity, position)` | `(entity: Entity, position: Vec3) => Promise<void>` | 在指定位置与实体交互 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `bot.useOn(targetEntity)` | `(targetEntity: Entity) => void` | 对实体使用手中物品 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `bot.updateSign(block, text, back?)` | `(block: Block, text: string, back?: boolean) => void` | 更新告示牌文字 | [blocks.js](mineflayer/lib/plugins/blocks.js) |

### 3.7 战斗

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.attack(entity)` | `(entity: Entity) => void` | 攻击实体 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `bot.swingArm(hand, showHand?)` | `(hand: 'left' \| 'right' \| undefined, showHand?: boolean) => void` | 挥动手臂 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.getExplosionDamages(targetEntity, position, radius, rawDamages?)` | `(targetEntity: Entity, position: Vec3, radius: number, rawDamages?: boolean) => number \| null` | 计算爆炸伤害 | [explosion.js](mineflayer/lib/plugins/explosion.js) |

### 3.8 聊天与命令

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.chat(message)` | `(message: string) => void` | 发送聊天消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.whisper(username, message)` | `(username: string, message: string) => void` | 发送私聊消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.tabComplete(str, assumeCommand?, sendBlockInSight?, timeout?)` | `(str: string, ...) => Promise<string[]>` | Tab 补全 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.addChatPattern(name, pattern, options?)` | `(name: string, pattern: RegExp, options?) => number` | 注册聊天匹配模式 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.addChatPatternSet(name, patterns, options?)` | `(name: string, patterns: RegExp[], options?) => number` | 注册一组聊天匹配模式 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.removeChatPattern(name)` | `(name: string \| number) => void` | 移除聊天匹配模式 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.awaitMessage(...args)` | `(...args: string[] \| RegExp[]) => Promise<string>` | 等待匹配的聊天消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `bot.chatAddPattern(pattern, chatType, description?)` | `(pattern: RegExp, chatType: string, description?: string) => number` | (已弃用) 旧版添加聊天模式 | [chat.js](mineflayer/lib/plugins/chat.js) |

### 3.9 物品与背包管理

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.setQuickBarSlot(slot)` | `(slot: number) => void` | 设置快捷栏当前槽位 (0-8) | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.equip(item, destination)` | `(item: Item \| number, destination: EquipmentDestination \| null) => Promise<void>` | 装备物品到指定槽位 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.unequip(destination)` | `(destination: EquipmentDestination \| null) => Promise<void>` | 卸下装备 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.tossStack(item)` | `(item: Item) => Promise<void>` | 丢弃整组物品 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.toss(itemType, metadata, count)` | `(itemType: number, metadata: number \| null, count: number \| null) => Promise<void>` | 丢弃指定类型和数量的物品 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.clickWindow(slot, mouseButton, mode)` | `(slot: number, mouseButton: number, mode: number) => Promise<void>` | 点击窗口槽位 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.putSelectedItemRange(start, end, window, slot)` | `(start: number, end: number, window: Window, slot: any) => Promise<void>` | 将物品放入指定范围 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.putAway(slot)` | `(slot: number) => Promise<void>` | 收纳物品 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.closeWindow(window)` | `(window: Window) => void` | 关闭窗口 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.transfer(options)` | `(options: TransferOptions) => Promise<void>` | 在容器间转移物品 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.moveSlotItem(sourceSlot, destSlot)` | `(sourceSlot: number, destSlot: number) => Promise<void>` | 移动槽位中的物品 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.updateHeldItem()` | `() => void` | 更新手持物品信息 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.getEquipmentDestSlot(destination)` | `(destination: string) => number` | 获取装备目标的槽位号 | [inventory.js](mineflayer/lib/plugins/inventory.js) |
| `bot.simpleClick.leftMouse(slot)` | `(slot: number) => Promise<void>` | 简化左键点击 | [simple_inventory.js](mineflayer/lib/plugins/simple_inventory.js) |
| `bot.simpleClick.rightMouse(slot)` | `(slot: number) => Promise<void>` | 简化右键点击 | [simple_inventory.js](mineflayer/lib/plugins/simple_inventory.js) |

### 3.10 容器操作

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.openContainer(chest, direction?, cursorPos?)` | `(chest: Block \| Entity, direction?, cursorPos?) => Promise<Chest \| Dispenser>` | 通用打开容器 (箱子/发射器) | [chest.js](mineflayer/lib/plugins/chest.js) |
| `bot.openChest(chest, direction?, cursorPos?)` | `(chest: Block \| Entity, direction?, cursorPos?) => Promise<Chest>` | 打开箱子 | [chest.js](mineflayer/lib/plugins/chest.js) |
| `bot.openFurnace(furnace)` | `(furnace: Block) => Promise<Furnace>` | 打开熔炉 | [furnace.js](mineflayer/lib/plugins/furnace.js) |
| `bot.openDispenser(dispenser)` | `(dispenser: Block) => Promise<Dispenser>` | 打开发射器 | [chest.js](mineflayer/lib/plugins/chest.js) |
| `bot.openEnchantmentTable(enchantmentTable)` | `(enchantmentTable: Block) => Promise<EnchantmentTable>` | 打开附魔台 | [enchantment_table.js](mineflayer/lib/plugins/enchantment_table.js) |
| `bot.openAnvil(anvil)` | `(anvil: Block) => Promise<Anvil>` | 打开铁砧 | [anvil.js](mineflayer/lib/plugins/anvil.js) |
| `bot.openVillager(villager)` | `(villager: Entity) => Promise<Villager>` | 打开村民交易界面 | [villager.js](mineflayer/lib/plugins/villager.js) |
| `bot.openBlock(block, direction?, cursorPos?)` | `(block: Block, direction?, cursorPos?) => Promise<Window>` | 通用打开方块 GUI | chest.js |
| `bot.openEntity(entity, Class)` | `(entity: Entity, Class: constructor) => Promise<Window>` | 通用打开实体 GUI | chest.js |
| `bot.trade(villagerInstance, tradeIndex, times?)` | `(villagerInstance: Villager, tradeIndex: string \| number, times?: number) => Promise<void>` | 与村民交易 | [villager.js](mineflayer/lib/plugins/villager.js) |

### 3.11 合成

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.craft(recipe, count?, craftingTable?)` | `(recipe: Recipe, count?: number, craftingTable?: Block) => Promise<void>` | 合成物品 | [craft.js](mineflayer/lib/plugins/craft.js) |
| `bot.recipesFor(itemType, metadata, minResultCount, craftingTable)` | `(itemType: number, metadata: number \| null, minResultCount: number \| null, craftingTable: Block \| boolean \| null) => Recipe[]` | 获取指定物品的合成配方 | [craft.js](mineflayer/lib/plugins/craft.js) |
| `bot.recipesAll(itemType, metadata, craftingTable)` | `(itemType: number, metadata: number \| null, craftingTable: Block \| boolean \| null) => Recipe[]` | 获取所有相关合成配方 | [craft.js](mineflayer/lib/plugins/craft.js) |

### 3.12 其他功能

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.sleep(bedBlock)` | `(bedBlock: Block) => Promise<void>` | 在指定的床上睡觉 | [bed.js](mineflayer/lib/plugins/bed.js) |
| `bot.isABed(bedBlock)` | `(bedBlock: Block) => boolean` | 判断一个方块是否是床 | [bed.js](mineflayer/lib/plugins/bed.js) |
| `bot.wake()` | `() => Promise<void>` | 起床 | [bed.js](mineflayer/lib/plugins/bed.js) |
| `bot.consume()` | `() => Promise<void>` | 使用/消耗手中物品 (吃东西等) | [consume 外置测试 / physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.fish()` | `() => Promise<void>` | 钓鱼 | [fishing.js](mineflayer/lib/plugins/fishing.js) |
| `bot.activateItem(offhand?)` | `(offhand?: boolean) => void` | 开始使用物品 (如拉弓) | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.deactivateItem()` | `() => void` | 停止使用物品 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `bot.writeBook(slot, pages)` | `(slot: number, pages: string[]) => Promise<void>` | 写入书与笔 | [book.js](mineflayer/lib/plugins/book.js) |
| `bot.setCommandBlock(pos, command, options)` | `(pos: Vec3, command: string, options: CommandBlockOptions) => void` | 设置命令方块 | [command_block.js](mineflayer/lib/plugins/command_block.js) |
| `bot.acceptResourcePack()` | `() => void` | 接受服务器资源包 | [resource_pack.js](mineflayer/lib/plugins/resource_pack.js) |
| `bot.denyResourcePack()` | `() => void` | 拒绝服务器资源包 | [resource_pack.js](mineflayer/lib/plugins/resource_pack.js) |
| `bot.respawn()` | `() => void` | 重生 | [health.js](mineflayer/lib/plugins/health.js) |
| `bot.setSettings(options)` | `(options: Partial<GameSettings>) => void` | 更新客户端设置 | [settings.js](mineflayer/lib/plugins/settings.js) |

### 3.13 插件管理

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.loadPlugin(plugin)` | `(plugin: Plugin) => void` | 加载单个插件 | [plugin_loader.js](mineflayer/lib/plugin_loader.js) |
| `bot.loadPlugins(plugins)` | `(plugins: Plugin[]) => void` | 批量加载插件 | [plugin_loader.js](mineflayer/lib/plugin_loader.js) |
| `bot.hasPlugin(plugin)` | `(plugin: Plugin) => boolean` | 检查插件是否已加载 | [plugin_loader.js](mineflayer/lib/plugin_loader.js) |

### 3.14 版本特性检测

| 方法 | 签名 | 作用 | 实现来源 |
|---|---|---|---|
| `bot.supportFeature(feature)` | `(feature: string) => boolean` | 检查当前版本是否支持某特性 | loader.js 代理到 registry.supportFeature |

---

## 四、Bot 事件 (BotEvents)

> bot 继承自 EventEmitter，所有事件定义在 [index.d.ts](mineflayer/index.d.ts) 的 `BotEvents` 接口中。

### 4.1 生命周期事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `connect` | `()` | 底层客户端连接成功 | loader.js |
| `inject_allowed` | `()` | 版本验证通过，插件即将注入 | loader.js |
| `login` | `()` | 登录包接收完成 | [game.js](mineflayer/lib/plugins/game.js) |
| `spawn` | `()` | 玩家首次生成 / 重生后 | [health.js](mineflayer/lib/plugins/health.js) |
| `respawn` | `()` | 服务器发送重生包 | [health.js](mineflayer/lib/plugins/health.js) |
| `death` | `()` | 玩家死亡 (生命值 <= 0) | [health.js](mineflayer/lib/plugins/health.js) |
| `end` | `(reason: string)` | 连接断开 | loader.js (代理 `_client.on('end')`) |
| `kicked` | `(reason: string, loggedIn: boolean)` | 被服务器踢出 | [kick.js](mineflayer/lib/plugins/kick.js) |
| `error` | `(err: Error)` | 发生错误 | loader.js |

### 4.2 游戏状态事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `game` | `()` | 游戏状态改变 (模式/难度/维度等) | [game.js](mineflayer/lib/plugins/game.js) |
| `health` | `()` | 生命值/饥饿值更新 | [health.js](mineflayer/lib/plugins/health.js) |
| `breath` | `()` | 氧气值更新 | [breath.js](mineflayer/lib/plugins/breath.js) |
| `experience` | `()` | 经验值更新 | [experience.js](mineflayer/lib/plugins/experience.js) |
| `rain` | `()` | 下雨状态改变 | [rain.js](mineflayer/lib/plugins/rain.js) |
| `time` | `()` | 时间更新 | [time.js](mineflayer/lib/plugins/time.js) |

### 4.3 移动相关事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `move` | `(position: Vec3)` | 玩家移动到新位置 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `forcedMove` | `()` | 服务器强制移动玩家 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `mount` | `()` | 骑乘上实体 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `dismount` | `(vehicle: Entity)` | 离开骑乘 | [physics.js](mineflayer/lib/plugins/physics.js) |
| `physicsTick` | `()` | 每个物理 tick | [physics.js](mineflayer/lib/plugins/physics.js) |
| `physicTick` | `()` | physicsTick 的别名 (拼写历史遗留) | [physics.js](mineflayer/lib/plugins/physics.js) |

### 4.4 实体事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `entitySpawn` | `(entity: Entity)` | 实体生成 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityGone` | `(entity: Entity)` | 实体消失 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityMoved` | `(entity: Entity)` | 实体移动 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityUpdate` | `(entity: Entity)` | 实体元数据更新 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityHurt` | `(entity: Entity, source: Entity)` | 实体受伤 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityDead` | `(entity: Entity)` | 实体死亡 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entitySwingArm` | `(entity: Entity)` | 实体挥动手臂 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityCrouch` | `(entity: Entity)` | 实体蹲下 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityUncrouch` | `(entity: Entity)` | 实体起身 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entitySleep` | `(entity: Entity)` | 实体躺下睡觉 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityWake` | `(entity: Entity)` | 实体醒来 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityAttach` | `(entity: Entity, vehicle: Entity)` | 实体骑乘到载具 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityDetach` | `(entity: Entity, vehicle: Entity)` | 实体离开载具 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityEat` | `(entity: Entity)` | 实体吃东西 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityEquip` | `(entity: Entity)` | 实体装备更新 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityEffect` | `(entity: Entity, effect: Effect)` | 实体获得药水效果 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityEffectEnd` | `(entity: Entity, effect: Effect)` | 实体药水效果结束 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityAttributes` | `(entity: Entity)` | 实体属性更新 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityHandSwap` | `(entity: Entity)` | 实体交换左右手 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityCriticalEffect` | `(entity: Entity)` | 实体暴击效果 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityMagicCriticalEffect` | `(entity: Entity)` | 实体魔法暴击效果 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityElytraFlew` | `(entity: Entity)` | 实体开始鞘翅飞行 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityTaming` | `(entity: Entity)` | 实体正在被驯服 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityTamed` | `(entity: Entity)` | 实体已被驯服 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityShakingOffWater` | `(entity: Entity)` | 实体抖水 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `entityEatingGrass` | `(entity: Entity)` | 实体吃草 (羊) | [entities.js](mineflayer/lib/plugins/entities.js) |
| `usedFirework` | `()` | 使用烟花火箭 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `itemDrop` | `(entity: Entity)` | 物品掉落 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `playerCollect` | `(collector: Entity, collected: Entity)` | 玩家收集物品 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `playerJoined` | `(player: Player)` | 其他玩家加入 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `playerUpdated` | `(player: Player)` | 玩家信息更新 | [entities.js](mineflayer/lib/plugins/entities.js) |
| `playerLeft` | `(player: Player)` | 其他玩家离开 | [entities.js](mineflayer/lib/plugins/entities.js) |

### 4.5 方块与世界事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `blockUpdate` | `(oldBlock: Block \| null, newBlock: Block)` | 方块状态更新 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `blockUpdate:(x, y, z)` | `(oldBlock: Block \| null, newBlock: Block \| null)` | 指定坐标的方块更新 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `chunkColumnLoad` | `(point: Vec3)` | 区块加载 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `chunkColumnUnload` | `(point: Vec3)` | 区块卸载 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `pistonMove` | `(block: Block, isPulling: number, direction: number)` | 活塞运动 | [blocks.js](mineflayer/lib/plugins/blocks.js) |
| `chestLidMove` | `(block: Block, isOpen: number, block2: Block \| null)` | 箱子盖子开合 | [blocks.js](mineflayer/lib/plugins/blocks.js) |

### 4.6 挖掘与建造事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `blockBreakProgressObserved` | `(block: Block, destroyStage: number)` | 观察到方块破坏进度 | [digging.js](mineflayer/lib/plugins/digging.js) |
| `blockBreakProgressEnd` | `(block: Block)` | 方块破坏进度结束 | [digging.js](mineflayer/lib/plugins/digging.js) |
| `diggingCompleted` | `(block: Block)` | 挖掘完成 | [digging.js](mineflayer/lib/plugins/digging.js) |
| `diggingAborted` | `(block: Block)` | 挖掘中断 | [digging.js](mineflayer/lib/plugins/digging.js) |

### 4.7 聊天事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `chat` | `(username, message, translate, jsonMsg, matches)` | 收到聊天消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `whisper` | `(username, message, translate, jsonMsg, matches)` | 收到私聊消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `message` | `(jsonMsg: ChatMessage, position: string)` | 收到原始系统消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `messagestr` | `(message: string, position: string, jsonMsg: ChatMessage)` | 收到纯文本系统消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `unmatchedMessage` | `(stringMsg: string, jsonMsg: ChatMessage)` | 收到未被匹配的消息 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `actionBar` | `(jsonMsg: ChatMessage)` | 收到 Action Bar 消息 | [chat.js](mineflayer/lib/plugins/chat.js) |

### 4.8 窗口与容器事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `windowOpen` | `(window: Window)` | 窗口打开 (箱子/熔炉等) | [chest.js](mineflayer/lib/plugins/chest.js) |
| `windowClose` | `(window: Window)` | 窗口关闭 | [chest.js](mineflayer/lib/plugins/chest.js) |
| `heldItemChanged` | `(newItem: Item \| null)` | 手持物品改变 | [inventory.js](mineflayer/lib/plugins/inventory.js) |

### 4.9 声音与粒子事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `soundEffectHeard` | `(soundName: string, position: Vec3, volume: number, pitch: number)` | 听到音效 | [sound.js](mineflayer/lib/plugins/sound.js) |
| `hardcodedSoundEffectHeard` | `(soundId: number, soundCategory: number, position: Vec3, volume: number, pitch: number)` | 听到硬编码音效 | [sound.js](mineflayer/lib/plugins/sound.js) |
| `noteHeard` | `(block: Block, instrument: Instrument, pitch: number)` | 听到音符盒 | [sound.js](mineflayer/lib/plugins/sound.js) |
| `particle` | `(particle: Particle)` | 粒子效果 | [particle.js](mineflayer/lib/plugins/particle.js) |

### 4.10 UI 事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `title` | `(text: string, type: "subtitle" \| "title")` | 显示标题/副标题 | [title.js](mineflayer/lib/plugins/title.js) |
| `sleep` | `()` | 开始睡觉 | [bed.js](mineflayer/lib/plugins/bed.js) |
| `wake` | `()` | 醒来 | [bed.js](mineflayer/lib/plugins/bed.js) |
| `spawnReset` | `()` | 出生点重置 | [spawn_point.js](mineflayer/lib/plugins/spawn_point.js) |
| `resourcePack` | `(url: string, hash?: string, uuid?: string)` | 服务器请求资源包 | [resource_pack.js](mineflayer/lib/plugins/resource_pack.js) |

### 4.11 记分板与队伍事件

| 事件名 | 回调参数 | 触发时机 | 实现来源 |
|---|---|---|---|
| `scoreboardCreated` | `(scoreboard: ScoreBoard)` | 记分板创建 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) |
| `scoreboardDeleted` | `(scoreboard: ScoreBoard)` | 记分板删除 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) |
| `scoreboardTitleChanged` | `(scoreboard: ScoreBoard)` | 记分板标题改变 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) |
| `scoreUpdated` | `(scoreboard: ScoreBoard, item: number)` | 记分板分数更新 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) |
| `scoreRemoved` | `(scoreboard: ScoreBoard, item: number)` | 记分板分数移除 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) |
| `scoreboardPosition` | `(position: DisplaySlot, scoreboard: ScoreBoard)` | 记分板显示位置改变 | [scoreboard.js](mineflayer/lib/plugins/scoreboard.js) |
| `teamCreated` | `(team: Team)` | 队伍创建 | [team.js](mineflayer/lib/plugins/team.js) |
| `teamRemoved` | `(team: Team)` | 队伍移除 | [team.js](mineflayer/lib/plugins/team.js) |
| `teamUpdated` | `(team: Team)` | 队伍更新 | [team.js](mineflayer/lib/plugins/team.js) |
| `teamMemberAdded` | `(team: Team)` | 成员加入队伍 | [team.js](mineflayer/lib/plugins/team.js) |
| `teamMemberRemoved` | `(team: Team)` | 成员离开队伍 | [team.js](mineflayer/lib/plugins/team.js) |
| `bossBarCreated` | `(bossBar: BossBar)` | Boss 血条创建 | [boss_bar.js](mineflayer/lib/plugins/boss_bar.js) |
| `bossBarDeleted` | `(bossBar: BossBar)` | Boss 血条删除 | [boss_bar.js](mineflayer/lib/plugins/boss_bar.js) |
| `bossBarUpdated` | `(bossBar: BossBar)` | Boss 血条更新 | [boss_bar.js](mineflayer/lib/plugins/boss_bar.js) |

---

## 五、BotOptions (创建机器人选项)

> 定义在 [index.d.ts](mineflayer/index.d.ts) 的 `BotOptions` 接口。继承自 minecraft-protocol 的 `ClientOptions`。

| 选项 | 类型 | 默认值 | 作用 | 实现位置 |
|---|---|---|---|---|
| `host` | string | `'localhost'` | 服务器 IP | 继承自 ClientOptions |
| `port` | number | `25565` | 服务器端口 | 继承自 ClientOptions |
| `username` | string | `'Player'` | 玩家名 | loader.js |
| `password` | string | - | 密码认证 | 继承自 ClientOptions |
| `auth` | string | `'mojang'` | 认证方式: `'microsoft'`, `'offline'` | 继承自 ClientOptions |
| `version` | string \| false | `false` | 指定 Minecraft 版本 (false=自动检测) | loader.js |
| `client` | Client | `null` | 复用已有的 minecraft-protocol 客户端 | loader.js |
| `brand` | string | `'vanilla'` | 客户端品牌名 | [game.js](mineflayer/lib/plugins/game.js) |
| `plugins` | PluginOptions | `{}` | 外部插件配置 | loader.js / [plugin_loader.js](mineflayer/lib/plugin_loader.js) |
| `loadInternalPlugins` | boolean | `true` | 是否加载内置插件 | loader.js |
| `logErrors` | boolean | `true` | 是否打印错误到控制台 | loader.js |
| `hideErrors` | boolean | `false` | 是否隐藏错误 | loader.js |
| `chat` | ChatLevel | `'enabled'` | 聊天级别: `'enabled'`, `'commandsOnly'`, `'disabled'` | [chat.js](mineflayer/lib/plugins/chat.js) |
| `colorsEnabled` | boolean | `true` | 是否启用颜色 | [settings.js](mineflayer/lib/plugins/settings.js) |
| `viewDistance` | ViewDistance | `'far'` | 视距: `'far'`, `'normal'`, `'short'`, `'tiny'` | [settings.js](mineflayer/lib/plugins/settings.js) |
| `mainHand` | MainHands | `'right'` | 主手: `'left'`, `'right'` | [settings.js](mineflayer/lib/plugins/settings.js) |
| `difficulty` | number | - | 难度设置 (0=和平, 1=简单, 2=普通, 3=困难) | [settings.js](mineflayer/lib/plugins/settings.js) |
| `chatLengthLimit` | number | - | 聊天消息最大长度 | chat.js |
| `physicsEnabled` | boolean | `true` | 是否启用物理引擎 | physics.js |
| `maxCatchupTicks` | number | `4` | 最大追赶 ticks | physics.js |
| `defaultChatPatterns` | boolean | `true` | 是否注册默认聊天模式 | [chat.js](mineflayer/lib/plugins/chat.js) |
| `respawn` | boolean | `true` | 死亡后是否自动重生 | [health.js](mineflayer/lib/plugins/health.js) |

---

## 六、核心导出类 (Exported Classes)

### 6.1 Location

- **源码**: [lib/location.js](mineflayer/lib/location.js)
- **导出路径**: `mineflayer.Location`
- **作用**: 将绝对坐标转换为区块内相对坐标

| 属性 | 类型 | 说明 |
|---|---|---|
| `floored` | Vec3 | 取整后的绝对坐标 |
| `blockPoint` | Vec3 | 在区块内的相对坐标 (0-15) |
| `chunkCorner` | Vec3 | 区块角落的绝对坐标 |
| `blockIndex` | number | 方块在区块内的一维索引 |
| `biomeBlockIndex` | number | 生物群落在区块内的一维索引 (xz平面) |
| `chunkYIndex` | number | 区块 Y 索引 |

### 6.2 Painting

- **源码**: [lib/painting.js](mineflayer/lib/painting.js)
- **导出路径**: `mineflayer.Painting`
- **作用**: 表示游戏中的画

| 属性 | 类型 | 说明 |
|---|---|---|
| `id` | number | 画的实体 ID |
| `position` | Vec3 | 画的位置 |
| `name` | string | 画的名字 |
| `direction` | Vec3 | 画的朝向 |

### 6.3 ScoreBoard

- **源码**: [lib/scoreboard.js](mineflayer/lib/scoreboard.js)
- **导出路径**: `mineflayer.ScoreBoard`
- **作用**: 表示记分板

| 属性/方法 | 类型 | 说明 |
|---|---|---|
| `name` | string | 记分板名称 |
| `title` | string | 记分板标题 |
| `itemsMap` | {[name: string]: ScoreBoardItem} | 项目映射 (name → item) |
| `items` | ScoreBoardItem[] | 排序后的项目列表 |
| `setTitle(title)` | `(title: string) => void` | 设置标题 |
| `add(name, value)` | `(name: string, value: number) => ScoreBoardItem` | 添加项目 |
| `remove(name)` | `(name: string) => ScoreBoardItem` | 移除项目 |

### 6.4 ScoreBoardItem

| 属性 | 类型 | 说明 |
|---|---|---|
| `name` | string | 项目名 |
| `displayName` | ChatMessage | 显示名称 |
| `value` | number | 分数 |

### 6.5 BossBar

- **源码**: [lib/bossbar.js](mineflayer/lib/bossbar.js)
- **导出路径**: `mineflayer.BossBar`
- **作用**: 表示 Boss 血条
- **注意**: BossBar 是一个工厂函数 `loader(registry)`，需要传入 registry 创建类

| 属性 | 类型 | 说明 |
|---|---|---|
| `entityUUID` | string | 关联实体的 UUID |
| `title` | string \| ChatMessage | 血条标题 |
| `health` | number | 生命值 (0-1) |
| `dividers` | number | 分段数 |
| `color` | string | 颜色: `'pink'`, `'blue'`, `'red'`, `'green'`, `'yellow'`, `'purple'`, `'white'` |
| `shouldDarkenSky` | boolean | 是否使天空变暗 |
| `isDragonBar` | boolean | 是否是末影龙血条样式 |
| `createFog` | boolean | 是否创建迷雾 |
| `shouldCreateFog` | boolean | createFog 的别名 |

### 6.6 Particle

- **源码**: [lib/particle.js](mineflayer/lib/particle.js)
- **导出路径**: `mineflayer.Particle`
- **作用**: 表示粒子效果
- **注意**: Particle 是一个工厂函数 `loader(registry)`

| 属性/方法 | 类型 | 说明 |
|---|---|---|
| `id` | number | 粒子类型 ID |
| `position` | Vec3 | 粒子位置 |
| `offset` | Vec3 | 粒子偏移 |
| `count` | number | 粒子数量 |
| `movementSpeed` | number | 粒子运动速度 |
| `longDistanceRender` | boolean | 是否长距离渲染 |
| `Particle.fromNetwork(packet)` | `(packet: Object) => Particle` | 从网络包创建 Particle (静态方法) |

### 6.7 Team

- **源码**: [lib/team.js](mineflayer/lib/team.js)
- **作用**: 表示队伍 (通常不直接导出，但 bot.teams 中包含)
- **注意**: Team 是一个工厂函数 `loader(registry)`

| 属性/方法 | 类型 | 说明 |
|---|---|---|
| `team` | string | 队伍内部名称 |
| `name` | ChatMessage | 队伍显示名称 |
| `friendlyFire` | number | 友军伤害 (0=关, 1=开) |
| `nameTagVisibility` | string | 名称标签可见性 |
| `collisionRule` | string | 碰撞规则 |
| `color` | string | 队伍颜色 |
| `prefix` | ChatMessage | 队伍前缀 |
| `suffix` | ChatMessage | 队伍后缀 |
| `members` | string[] | 成员列表 |
| `add(name)` | `(name: string) => void` | 添加成员 |
| `remove(name)` | `(name: string) => void` | 移除成员 |
| `update(...)` | `(...) => void` | 更新队伍信息 |
| `displayName(member)` | `(member: string) => ChatMessage` | 获取成员的显示名称 (前缀+颜色+名字+后缀) |
| `parseMessage(value)` | `(value: string) => ChatMessage` | 解析消息 |

---

## 七、窗口子类 (Window Subclasses)

### 7.1 Chest (箱子)

- **源码**: [index.d.ts](mineflayer/index.d.ts) 定义类型，实际由 prismarine-windows 提供
- **父类**: `Window<StorageEvents>`

| 方法 | 签名 | 作用 |
|---|---|---|
| `close()` | `() => void` | 关闭箱子 |
| `deposit(itemType, metadata, count)` | `(itemType: number, metadata: number \| null, count: number \| null) => Promise<void>` | 存入物品 |
| `withdraw(itemType, metadata, count)` | `(itemType: number, metadata: number \| null, count: number \| null) => Promise<void>` | 取出物品 |

### 7.2 Furnace (熔炉)

- **源码**: [lib/plugins/furnace.js](mineflayer/lib/plugins/furnace.js)
- **父类**: `Window<FurnaceEvents>`

| 属性/方法 | 类型 | 作用 |
|---|---|---|
| `fuel` | number | 当前燃料剩余 |
| `progress` | number | 当前烧炼进度 |
| `close()` | `() => void` | 关闭熔炉 |
| `takeInput()` | `() => Promise<Item>` | 取出输入槽物品 |
| `takeFuel()` | `() => Promise<Item>` | 取出燃料槽物品 |
| `takeOutput()` | `() => Promise<Item>` | 取出输出槽物品 |
| `putInput(itemType, metadata, count)` | `(...) => Promise<void>` | 放入输入槽 |
| `putFuel(itemType, metadata, count)` | `(...) => Promise<void>` | 放入燃料槽 |
| `inputItem()` | `() => Item` | 查看输入槽物品 |
| `fuelItem()` | `() => Item` | 查看燃料槽物品 |
| `outputItem()` | `() => Item` | 查看输出槽物品 |

### 7.3 Dispenser (发射器)

- **源码**: [index.d.ts](mineflayer/index.d.ts) 定义类型
- **父类**: `Window<StorageEvents>`
- **方法**: 同 Chest (`close`, `deposit`, `withdraw`)

### 7.4 EnchantmentTable (附魔台)

- **源码**: [lib/plugins/enchantment_table.js](mineflayer/lib/plugins/enchantment_table.js)
- **父类**: `Window<ConditionalStorageEvents>`

| 属性/方法 | 类型 | 作用 |
|---|---|---|
| `enchantments` | Enchantment[] | 可用的附魔列表 |
| `close()` | `() => void` | 关闭附魔台 |
| `targetItem()` | `() => Item` | 查看目标物品 |
| `enchant(choice)` | `(choice: string \| number) => Promise<Item>` | 附魔 |
| `takeTargetItem()` | `() => Promise<Item>` | 取出目标物品 |
| `putTargetItem(item)` | `(item: Item) => Promise<Item>` | 放入目标物品 |
| `putLapis(item)` | `(item: Item) => Promise<Item>` | 放入青金石 |

### 7.5 Anvil (铁砧)

- **源码**: [lib/plugins/anvil.js](mineflayer/lib/plugins/anvil.js)

| 方法 | 签名 | 作用 |
|---|---|---|
| `combine(itemOne, itemTwo, name?)` | `(itemOne: Item, itemTwo: Item, name?: string) => Promise<void>` | 合并两个物品 |
| `rename(item, name?)` | `(item: Item, name?: string) => Promise<void>` | 重命名物品 |

### 7.6 Villager (村民交易)

- **源码**: [lib/plugins/villager.js](mineflayer/lib/plugins/villager.js)
- **父类**: `Window<ConditionalStorageEvents>`

| 属性/方法 | 类型 | 作用 |
|---|---|---|
| `trades` | VillagerTrade[] | 可用交易列表 |
| `close()` | `() => void` | 关闭交易界面 |

### 7.7 VillagerTrade (交易项)

| 属性 | 类型 | 说明 |
|---|---|---|
| `inputItem1` | Item | 第一个输入物品 |
| `inputItem2` | Item \| null | 第二个输入物品 |
| `outputItem` | Item | 输出物品 |
| `hasItem2` | boolean | 是否需要第二个输入物品 |
| `tradeDisabled` | boolean | 交易是否已禁用 |
| `nbTradeUses` | number | 已交易次数 |
| `maximumNbTradeUses` | number | 最大交易次数 |
| `xp` | number | 交易可得经验值 |
| `specialPrice` | number | 特殊价格修正 |
| `priceMultiplier` | number | 价格乘数 |
| `demand` | number | 需求值 |
| `realPrice` | number | 实际价格 |

---

## 八、公共类型定义

### 8.1 基础类型

| 类型名 | 值 / 定义 | 定义位置 |
|---|---|---|
| `LevelType` | `'default' \| 'flat' \| 'largeBiomes' \| 'amplified' \| 'customized' \| 'buffet' \| 'default_1_1'` | [index.d.ts](mineflayer/index.d.ts) |
| `GameMode` | `'survival' \| 'creative' \| 'adventure' \| 'spectator'` | [index.d.ts](mineflayer/index.d.ts) |
| `Dimension` | `'the_nether' \| 'overworld' \| 'the_end'` | [index.d.ts](mineflayer/index.d.ts) |
| `Difficulty` | `'peaceful' \| 'easy' \| 'normal' \| 'hard'` | [index.d.ts](mineflayer/index.d.ts) |
| `ChatLevel` | `'enabled' \| 'commandsOnly' \| 'disabled'` | [index.d.ts](mineflayer/index.d.ts) |
| `ViewDistance` | `'far' \| 'normal' \| 'short' \| 'tiny' \| number` | [index.d.ts](mineflayer/index.d.ts) |
| `MainHands` | `'left' \| 'right'` | [index.d.ts](mineflayer/index.d.ts) |
| `ControlState` | `'forward' \| 'back' \| 'left' \| 'right' \| 'jump' \| 'sprint' \| 'sneak'` | [index.d.ts](mineflayer/index.d.ts) |
| `EquipmentDestination` | `'hand' \| 'head' \| 'torso' \| 'legs' \| 'feet' \| 'off-hand'` | [index.d.ts](mineflayer/index.d.ts) |
| `DisplaySlot` | `'list' \| 'sidebar' \| 'belowName' \| 3-18` | [index.d.ts](mineflayer/index.d.ts) |
| `Plugin` | `(bot: Bot, options: BotOptions) => void` | [index.d.ts](mineflayer/index.d.ts) |

### 8.2 对象类型

| 类型名 | 属性 |
|---|---|
| `GameState` | `{levelType, gameMode, hardcore, dimension, difficulty, maxPlayers, serverBrand}` |
| `Player` | `{uuid, username, displayName, gamemode, ping, entity, skinData, profileKeys?}` |
| `SkinData` | `{url, model}` |
| `Experience` | `{level, points, progress}` |
| `Time` | `{doDaylightCycle, bigTime, time, timeOfDay, day, isDay, moonPhase, bigAge, age}` |
| `PhysicsOptions` | `{maxGroundSpeed, terminalVelocity, walkingAcceleration, gravity, groundFriction, playerApothem, playerHeight, jumpSpeed, yawSpeed, pitchSpeed, sprintSpeed, maxGroundSpeedSoulSand, maxGroundSpeedWater}` |
| `ControlStateStatus` | `{forward, back, left, right, jump, sprint, sneak}` (均为 boolean) |
| `GameSettings` | `{chat, colorsEnabled, viewDistance, difficulty, skinParts, mainHand}` |
| `SkinParts` | `{showCape, showJacket, showLeftSleeve, showRightSleeve, showLeftPants, showRightPants, showHat}` (均为 boolean) |
| `Effect` | `{id, amplifier, duration}` |
| `Instrument` | `{id, name}` (name: `'harp' \| 'doubleBass' \| 'snareDrum' \| 'sticks' \| 'bassDrum'`) |
| `Enchantment` | `{level, expected: {enchant, level}}` |
| `ChatPattern` | `{pattern: RegExp, type: string, description: string}` |
| `CommandBlockOptions` | `{mode, trackOutput, conditional, alwaysActive}` |
| `FindBlockOptions` | `{point?, matching, maxDistance?, count?, useExtraInfo?}` |
| `TransferOptions` | `{window, itemType, metadata, count?, sourceStart, sourceEnd, destStart, destEnd}` |
| `chatPatternOptions` | `{repeat: boolean, parse: boolean}` |
| `Tablist` | `{header: ChatMessage, footer: ChatMessage}` |
| `simpleClick` | `{leftMouse(slot), rightMouse(slot)}` |

---

## 九、内部通用工具 (lib/ 下的非插件文件)

> 这些文件虽然不全是公开 API，但部分内容在模块导出中可用，或对理解项目结构有帮助。

### 9.1 promise_utils.js

**源码**: [lib/promise_utils.js](mineflayer/lib/promise_utils.js)

| 导出函数 | 签名 | 作用 |
|---|---|---|
| `once(emitter, event, timeout?)` | `(emitter, event, timeout?: number) => Promise<any[]>` | 等待事件触发一次 (超时默认 20s) |
| `onceWithCleanup(emitter, event, opts?)` | `(emitter, event, {timeout?, checkCondition?}) => Promise<any[]>` | 带条件和超时的事件等待 |
| `sleep(ms)` | `(ms: number) => Promise<void>` | 延迟指定毫秒 |
| `createTask()` | `() => {promise, cancel, finish, done}` | 创建可取消的 Promise 任务 |
| `createDoneTask()` | `() => {promise, cancel, finish, done}` | 创建已完成的 Promise 任务 |
| `withTimeout(promise, timeout)` | `(promise: Promise, timeout: number) => Promise` | 给 Promise 加超时 |

### 9.2 conversions.js

**源码**: [lib/conversions.js](mineflayer/lib/conversions.js)

| 导出函数 | 作用 |
|---|---|
| `toRadians(degrees)` | 角度转弧度 |
| `toDegrees(radians)` | 弧度转角度 |
| `fromNotchianYaw(yaw)` | Notch 偏航角 → 弧度偏航角 |
| `fromNotchianPitch(pitch)` | Notch 俯仰角 → 弧度俯仰角 |
| `fromNotchVelocity(vel)` | Notch 速度 → Vec3 速度向量 |
| `toNotchianYaw(yaw)` | 弧度偏航角 → Notch 偏航角 |
| `toNotchianPitch(pitch)` | 弧度俯仰角 → Notch 俯仰角 |
| `fromNotchianYawByte(yaw)` | Notch 字节偏航角 → 弧度 |
| `fromNotchianPitchByte(pitch)` | Notch 字节俯仰角 → 弧度 |

### 9.3 math.js

**源码**: [lib/math.js](mineflayer/lib/math.js)

| 导出函数 | 作用 |
|---|---|
| `clamp(min, x, max)` | 数值钳制 |
| `euclideanMod(numerator, denominator)` | 欧几里德取模 (结果始终非负) |

### 9.4 version.js

**源码**: [lib/version.js](mineflayer/lib/version.js)

定义了 28 个测试版本: `['1.8.8', '1.9.4', '1.10.2', '1.11.2', '1.12.2', '1.13.2', '1.14.4', '1.15.2', '1.16.5', '1.17.1', '1.18.2', '1.19', '1.19.2', '1.19.3', '1.19.4', '1.20.1', '1.20.2', '1.20.4', '1.20.6', '1.21.1', '1.21.3', '1.21.4', '1.21.5', '1.21.6', '1.21.8', '1.21.9', '1.21.11', '26.2']`

---

## 十、插件架构总览

所有功能通过 **41 个内部插件** 注入到 bot 对象上。插件加载流程:

```
createBot(options)
  ├── 创建 EventEmitter (bot)
  ├── 加载 plugin_loader.js → bot.loadPlugin / bot.loadPlugins / bot.hasPlugin
  ├── 注册 41 个内部插件 (lib/plugins/*.js)
  ├── 注册外部插件 (options.plugins)
  ├── 创建 minecraft-protocol 客户端 (bot._client)
  └── 连接成功后 → 初始化 registry → 触发 inject_allowed → 所有插件执行 inject(bot, options)
```

### 41 个内部插件及文件路径

| 插件名 | 文件 | 主要功能 |
|---|---|---|
| anvil | [lib/plugins/anvil.js](mineflayer/lib/plugins/anvil.js) | 铁砧 GUI 操作 |
| bed | [lib/plugins/bed.js](mineflayer/lib/plugins/bed.js) | 睡觉/起床 |
| block_actions | [lib/plugins/block_actions.js](mineflayer/lib/plugins/block_actions.js) | 激活方块 (按钮/拉杆/门) |
| blocks | [lib/plugins/blocks.js](mineflayer/lib/plugins/blocks.js) | 方块查询 (blockAt, findBlock 等) |
| book | [lib/plugins/book.js](mineflayer/lib/plugins/book.js) | 书与笔编辑 |
| boss_bar | [lib/plugins/boss_bar.js](mineflayer/lib/plugins/boss_bar.js) | Boss 血条追踪 |
| breath | [lib/plugins/breath.js](mineflayer/lib/plugins/breath.js) | 氧气追踪 |
| chat | [lib/plugins/chat.js](mineflayer/lib/plugins/chat.js) | 聊天发送/接收/匹配 |
| chest | [lib/plugins/chest.js](mineflayer/lib/plugins/chest.js) | 箱子/容器打开 |
| command_block | [lib/plugins/command_block.js](mineflayer/lib/plugins/command_block.js) | 命令方块交互 |
| craft | [lib/plugins/craft.js](mineflayer/lib/plugins/craft.js) | 合成系统 |
| creative | [lib/plugins/creative.js](mineflayer/lib/plugins/creative.js) | 创造模式物品栏/飞行 |
| digging | [lib/plugins/digging.js](mineflayer/lib/plugins/digging.js) | 挖掘方块 |
| enchantment_table | [lib/plugins/enchantment_table.js](mineflayer/lib/plugins/enchantment_table.js) | 附魔台 GUI |
| entities | [lib/plugins/entities.js](mineflayer/lib/plugins/entities.js) | 实体追踪/查询 |
| experience | [lib/plugins/experience.js](mineflayer/lib/plugins/experience.js) | 经验值追踪 |
| explosion | [lib/plugins/explosion.js](mineflayer/lib/plugins/explosion.js) | 爆炸伤害计算 |
| fishing | [lib/plugins/fishing.js](mineflayer/lib/plugins/fishing.js) | 钓鱼 |
| furnace | [lib/plugins/furnace.js](mineflayer/lib/plugins/furnace.js) | 熔炉 GUI |
| game | [lib/plugins/game.js](mineflayer/lib/plugins/game.js) | 游戏状态 (模式/难度/维度) |
| generic_place | [lib/plugins/generic_place.js](mineflayer/lib/plugins/generic_place.js) | 通用方块/实体放置 |
| health | [lib/plugins/health.js](mineflayer/lib/plugins/health.js) | 生命值/食物追踪 |
| inventory | [lib/plugins/inventory.js](mineflayer/lib/plugins/inventory.js) | 完整背包管理 |
| kick | [lib/plugins/kick.js](mineflayer/lib/plugins/kick.js) | 被踢原因处理 |
| particle | [lib/plugins/particle.js](mineflayer/lib/plugins/particle.js) | 粒子效果事件 |
| physics | [lib/plugins/physics.js](mineflayer/lib/plugins/physics.js) | 移动/控制/物理模拟 |
| place_block | [lib/plugins/place_block.js](mineflayer/lib/plugins/place_block.js) | 放置方块 |
| place_entity | [lib/plugins/place_entity.js](mineflayer/lib/plugins/place_entity.js) | 放置实体 (船/矿车) |
| rain | [lib/plugins/rain.js](mineflayer/lib/plugins/rain.js) | 天气追踪 |
| ray_trace | [lib/plugins/ray_trace.js](mineflayer/lib/plugins/ray_trace.js) | 射线追踪 / 视线检测 |
| resource_pack | [lib/plugins/resource_pack.js](mineflayer/lib/plugins/resource_pack.js) | 资源包处理 |
| scoreboard | [lib/plugins/scoreboard.js](mineflayer/lib/plugins/scoreboard.js) | 记分板追踪 |
| settings | [lib/plugins/settings.js](mineflayer/lib/plugins/settings.js) | 客户端设置 |
| simple_inventory | [lib/plugins/simple_inventory.js](mineflayer/lib/plugins/simple_inventory.js) | 简化背包点击操作 |
| sound | [lib/plugins/sound.js](mineflayer/lib/plugins/sound.js) | 音效事件 |
| spawn_point | [lib/plugins/spawn_point.js](mineflayer/lib/plugins/spawn_point.js) | 出生点追踪 |
| tablist | [lib/plugins/tablist.js](mineflayer/lib/plugins/tablist.js) | Tab 列表 |
| team | [lib/plugins/team.js](mineflayer/lib/plugins/team.js) | 队伍追踪 |
| time | [lib/plugins/time.js](mineflayer/lib/plugins/time.js) | 时间追踪 |
| title | [lib/plugins/title.js](mineflayer/lib/plugins/title.js) | 标题/副标题事件 |
| villager | [lib/plugins/villager.js](mineflayer/lib/plugins/villager.js) | 村民交易 GUI |
