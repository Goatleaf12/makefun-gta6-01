// Solmar Bay — screenshot staging for the maker's own shots.
// ?shot=cover|street|drive|menu&seed=N positions the world, the player,
// the police and the mission so each screenshot shows several systems
// at once. The game auto-starts (no menu) in shot mode, and the world
// runs a few seconds before the capture script takes the picture.
// Positions below are staged close to where the capture lands: the
// headless clock runs slow, so the world barely moves between staging
// and the shutter, and anything staged far out never reaches the frame.

export function stageShot(world, shot) {
  const { player, police, missions, traffic, cameraRig, hud } = world;
  hud.showMenu(false);
  hud.showHud(true);
  world.state = 'playing';

  if (shot === 'cover') {
    // The money shot: Dax mid-chase on the avenue, wanted 3 stars, two
    // cruisers pulling alongside from behind, a roadblock ahead, the
    // delivery beacon glowing downtown, traffic all around.
    player.exitCarIfDriving();
    const car = world.parked.cars[2];
    player.enterCar(car);
    world.cruise = true; // hold speed with no hands on the keys
    player.car.pos.set(3, 0, -60); // avenue x=0, right-hand lane
    player.car.heading = Math.PI; // driving toward -z, downtown ahead
    player.car.speed = 26;
    player.car.syncMesh();
    police.setWanted(3);
    // Two cruisers head-on, coming down the avenue at the player: white
    // bodies and flashing light bars facing the camera, so the chase
    // reads in one glance. They sit well ahead of the player and close
    // slowly — staged too close, they ram Dax before the shutter lands
    // and the cover shows a crash instead of a chase.
    const spots = [{ x: -2.5, z: -95 }, { x: 5, z: -92 }];
    for (let i = 0; i < police.cruisers.length; i++) {
      const cruiser = police.cruisers[i];
      const spot = spots[i % spots.length];
      cruiser.pos.set(spot.x, 0, spot.z);
      cruiser.heading = 0; // facing +z, straight at the player
      cruiser.speed = 10;
      cruiser.syncMesh();
    }
    // The roadblock pair, parked across the avenue further ahead, both
    // cruisers placed by hand: one roadblock, two cars, no gaps.
    const blocks = [{ x: -2, z: -100 }, { x: 4, z: -100 }];
    for (let i = 0; i < police.roadblocks.length; i++) {
      const block = police.roadblocks[i];
      const spot = blocks[i % blocks.length];
      block.mesh.position.set(spot.x, 0, spot.z);
      block.mesh.rotation.y = Math.PI / 2; // length across the road
      block.x = spot.x;
      block.z = spot.z;
    }
    missions.index = 1;
    missions.start();
    cameraRig.distance = 11;
    cameraRig.fixedDistance = 11;
    cameraRig.pitch = 0.34;
    cameraRig.snapBehind(player.car.pos, Math.PI);
    hud.setObjective(missions.objectiveText(player.position));
  } else if (shot === 'street') {
    // On foot on the marina boulevard's east sidewalk, looking north
    // down the avenue: lamps and palms recede, buildings line the right,
    // the beach sits to the left. Sidewalk, not asphalt: Dax is a
    // pedestrian here, and the shot should say so.
    player.exitCarIfDriving();
    player.pos.set(-152.5, 0, -20);
    player.heading = Math.PI; // facing north, down the boulevard
    player.syncMesh();
    police.setWanted(0);
    missions.index = 0;
    missions.start();
    cameraRig.snapBehind(player.pos, Math.PI);
    hud.setObjective(missions.objectiveText(player.position));
  } else if (shot === 'drive') {
    // Flat out through downtown at sunset, towers ahead, traffic around,
    // the taxi's yellow roof sign in the next lane.
    player.exitCarIfDriving();
    const car = world.parked.cars[6];
    player.enterCar(car);
    world.cruise = true; // hold speed with no hands on the keys
    player.car.pos.set(3, 0, 120); // avenue x=0, right-hand lane
    player.car.heading = Math.PI;
    player.car.speed = 34;
    player.car.syncMesh();
    police.setWanted(0);
    missions.index = 1;
    missions.start();
    // Two traffic cars on the avenue ahead, one each way, so the drive
    // shot shows the city moving and not an empty road. They sit close
    // to the player's start: the headless clock runs slow, so a car
    // staged a hundred metres out would never reach the frame.
    const lead = traffic.cars[1];
    if (lead) { lead.axis = 'x'; lead.line = 0; lead.along = 70; lead.dir = -1; lead.lane = -3; }
    const oncoming = traffic.cars[3];
    if (oncoming) { oncoming.axis = 'x'; oncoming.line = 0; oncoming.along = 80; oncoming.dir = 1; oncoming.lane = 3; }
    cameraRig.distance = 12;
    cameraRig.fixedDistance = 12;
    cameraRig.pitch = 0.36;
    cameraRig.snapBehind(player.car.pos, Math.PI);
    hud.setObjective(missions.objectiveText(player.position));
  } else if (shot === 'menu') {
    // Start screen over the living city: the menu is the screenshot.
    player.exitCarIfDriving();
    player.pos.set(-150, 0, 60);
    player.heading = -Math.PI / 2;
    player.syncMesh();
    police.setWanted(0);
    world.state = 'menu';
    hud.showMenu(true);
    hud.showHud(false);
    cameraRig.yaw = -Math.PI / 2 + Math.PI;
    cameraRig.pitch = 0.3; // a touch higher: more city and sky, less road
  }
}
