/*
  Fantasy Fortress - modular 28 mm terrain
  Units: millimetres

  Change `part` or use one of the preset .scad files.
  Designed for FDM printing without supports where practical.
*/

// Preset files define `part` before including this file.
selected_part = is_undef(part) ? "wall" : part;

// ---------- Global parameters ----------
$fa = 6;
$fs = 1.2;

fit_clearance = 0.25; // per side; try 0.20-0.35 for a Bambu Lab P2S

wall_length = 180;
wall_depth = 32;
wall_body_height = 125;
wall_total_height = 140;

gate_length = 220;
gate_opening_width = 70;
gate_spring_height = 76;
gate_arch_radius = gate_opening_width / 2;

tower_radius = 55;
tower_body_height = 190;
tower_total_height = 210;
tower_shell = 4;

socket_depth = 8;
socket_width = 12;
socket_height = 7;
socket_levels = [38, 88];

groove_depth = 0.8;
groove_width = 1.2;
course_height = 13;

module rounded_box(size = [10, 10, 10], radius = 1) {
    hull() {
        for (x = [radius, size[0] - radius])
            for (y = [radius, size[1] - radius])
                translate([x, y, 0])
                    cylinder(h = size[2], r = radius);
    }
}

module arched_opening(width, spring_z, depth, radius) {
    translate([-width / 2, -depth / 2, -1])
        cube([width, depth, spring_z + 1]);

    intersection() {
        translate([0, -depth / 2, spring_z])
            rotate([-90, 0, 0])
                cylinder(h = depth, r = radius);
        translate([-radius - 1, -depth / 2 - 1, spring_z])
            cube([2 * radius + 2, depth + 2, radius + 2]);
    }
}

module end_sockets(length, depth) {
    for (x_side = [-1, 1])
        for (z = socket_levels)
            translate([
                x_side < 0 ? -length / 2 - 0.01 : length / 2 - socket_depth,
                -socket_width / 2 - fit_clearance,
                z - socket_height / 2 - fit_clearance
            ])
                cube([
                    socket_depth + 0.02,
                    socket_width + 2 * fit_clearance,
                    socket_height + 2 * fit_clearance
                ]);
}

module stone_grooves(length, depth, height, skip_gate = false) {
    // Horizontal mortar courses on both broad faces.
    for (z = [course_height : course_height : height - 4])
        for (side = [-1, 1])
            translate([
                -length / 2,
                side < 0 ? -depth / 2 - 0.01 : depth / 2 - groove_depth + 0.01,
                z - groove_width / 2
            ])
                cube([length, groove_depth, groove_width]);

    // Staggered vertical joints.
    for (row = [0 : floor(height / course_height) - 1]) {
        offset = (row % 2) * 12;
        for (x = [-length / 2 + 12 + offset : 24 : length / 2 - 4])
            if (!skip_gate || abs(x) > gate_opening_width / 2 + 2)
                for (side = [-1, 1])
                    translate([
                        x - groove_width / 2,
                        side < 0 ? -depth / 2 - 0.01 : depth / 2 - groove_depth + 0.01,
                        row * course_height
                    ])
                        cube([groove_width, groove_depth, course_height]);
    }
}

module arrow_slit(depth = wall_depth + 2) {
    union() {
        translate([-2, -depth / 2, -10])
            cube([4, depth, 20]);
        translate([-6, -depth / 2, -2])
            cube([12, depth, 4]);
    }
}

module wall_battlements(length, depth) {
    parapet_depth = 5;
    merlon_width = 15;
    merlon_gap = 12;
    battlement_z = wall_body_height;

    // Thin continuous parapets provide a strong printable walkway edge.
    for (side = [-1, 1])
        translate([
            -length / 2,
            side < 0 ? -depth / 2 : depth / 2 - parapet_depth,
            battlement_z
        ])
            cube([length, parapet_depth, 5]);

    count = floor(length / (merlon_width + merlon_gap));
    used = count * (merlon_width + merlon_gap) - merlon_gap;
    start = -used / 2;
    for (i = [0 : count - 1])
        for (side = [-1, 1])
            translate([
                start + i * (merlon_width + merlon_gap),
                side < 0 ? -depth / 2 : depth / 2 - parapet_depth,
                battlement_z + 5
            ])
                cube([merlon_width, parapet_depth, wall_total_height - battlement_z - 5]);
}

module wall_core(length = wall_length, with_gate = false) {
    difference() {
        union() {
            translate([-length / 2, -wall_depth / 2, 0])
                cube([length, wall_depth, wall_body_height]);
            wall_battlements(length, wall_depth);
        }

        end_sockets(length, wall_depth);
        stone_grooves(length, wall_depth, wall_body_height, with_gate);

        if (with_gate)
            arched_opening(
                gate_opening_width,
                gate_spring_height,
                wall_depth + 2,
                gate_arch_radius
            );
        else
            for (x = [-wall_length / 4, wall_length / 4])
                translate([x, 0, 78])
                    arrow_slit();
    }
}

module wall() {
    wall_core(wall_length, false);
}

module gate_wall() {
    difference() {
        wall_core(gate_length, true);

        // Recesses identify the front and give the gate a dressed-stone frame.
        for (x = [-gate_opening_width / 2 - 8, gate_opening_width / 2 + 8])
            translate([x - 3, -wall_depth / 2 - 0.01, 12])
                cube([6, groove_depth + 0.4, gate_spring_height + gate_arch_radius - 12]);
    }

    // Stone voussoirs around the arch, kept shallow and support-free.
    for (a = [12 : 16 : 168])
        translate([
            (gate_arch_radius + 5) * cos(a),
            -wall_depth / 2 - 1.2,
            gate_spring_height + (gate_arch_radius + 5) * sin(a)
        ])
            rotate([90, 0, -a])
                rounded_box([10, 2.2, 9], 0.8);
}

module gate_doors() {
    door_thickness = 3.2;
    leaf_width = gate_opening_width / 2 - 1.2;
    door_height = gate_spring_height - 1;

    for (side = [-1, 1]) {
        x0 = side < 0 ? -gate_opening_width / 2 + 0.6 : 0.6;
        translate([x0, 0, 0])
            union() {
                cube([leaf_width, door_thickness, door_height]);

                // Vertical planks.
                for (x = [5 : 7 : leaf_width - 3])
                    translate([x - 0.5, -0.5, 0])
                        cube([1, door_thickness + 1, door_height]);

                // Iron straps.
                for (z = [15, 43, 69])
                    translate([1.5, -0.9, z])
                        cube([leaf_width - 3, door_thickness + 1.8, 3]);

                translate([
                    side < 0 ? leaf_width - 6 : 3,
                    -1.2,
                    door_height / 2
                ])
                    rotate([-90, 0, 0])
                        cylinder(h = door_thickness + 2.4, r = 2);
            }
    }
}

module tower_docking_pads(apothem) {
    pad_depth = 9;
    pad_width = 24;
    pad_height = 116;

    for (angle = [0, 90, 180, 270])
        rotate([0, 0, angle])
            translate([apothem - 0.5, -pad_width / 2, 16])
                cube([pad_depth, pad_width, pad_height]);
}

module tower_sockets(apothem) {
    cut_depth = socket_depth + 1;
    for (angle = [0, 90, 180, 270])
        rotate([0, 0, angle])
            for (z = socket_levels)
                translate([
                    apothem + 1.01,
                    -socket_width / 2 - fit_clearance,
                    z - socket_height / 2 - fit_clearance
                ])
                    cube([
                        cut_depth,
                        socket_width + 2 * fit_clearance,
                        socket_height + 2 * fit_clearance
                    ]);
}

module tower_stone_grooves(apothem) {
    // Mortar lines on the four docking faces.
    for (angle = [0, 90, 180, 270])
        rotate([0, 0, angle])
            for (z = [course_height : course_height : tower_body_height - 4])
                translate([
                    apothem + 8.5,
                    -12,
                    z - groove_width / 2
                ])
                    cube([groove_depth + 0.6, 24, groove_width]);
}

module tower_battlements(apothem) {
    parapet_base = 8;
    merlon_height = tower_total_height - tower_body_height - parapet_base;

    difference() {
        translate([0, 0, tower_body_height])
            cylinder(h = parapet_base, r = tower_radius, $fn = 8);
        translate([0, 0, tower_body_height - 1])
            cylinder(h = parapet_base + 2, r = tower_radius - tower_shell, $fn = 8);
    }

    // Three merlons per octagonal face.
    for (angle = [0 : 45 : 315])
        rotate([0, 0, angle])
            for (offset = [-22, 0, 22])
                translate([
                    apothem - 3,
                    offset - 6,
                    tower_body_height + parapet_base
                ])
                    cube([6, 12, merlon_height]);
}

module tower() {
    apothem = tower_radius * cos(22.5);

    difference() {
        union() {
            difference() {
                cylinder(h = tower_body_height, r = tower_radius, $fn = 8);
                translate([0, 0, -1])
                    cylinder(
                        h = tower_body_height - 3,
                        r = tower_radius - tower_shell,
                        $fn = 8
                    );
            }
            tower_docking_pads(apothem);
            tower_battlements(apothem);
        }

        tower_sockets(apothem);
        tower_stone_grooves(apothem);

        // Arrow slits on diagonal faces, clear of all four wall ports.
        for (angle = [45 : 90 : 315])
            rotate([0, 0, angle])
                union() {
                    translate([apothem - 1, -2, 102])
                        cube([tower_shell + 5, 4, 20]);
                    translate([apothem - 1, -6, 110])
                        cube([tower_shell + 5, 12, 4]);
                }
    }
}

module connector_key() {
    half_length = socket_depth - 0.7;
    neck = 1.6;

    translate([-(2 * half_length + neck) / 2, -socket_width / 2, 0])
        rounded_box(
            [2 * half_length + neck, socket_width, socket_height],
            0.7
        );
}

module demo() {
    wall();
    translate([wall_length / 2 + tower_radius * cos(22.5) + 9, 0, 0])
        tower();
    translate([-wall_length - 30, 0, 0])
        gate_wall();
    translate([0, -60, 0])
        connector_key();
}

if (selected_part == "wall")
    wall();
else if (selected_part == "gate")
    gate_wall();
else if (selected_part == "gate_doors")
    gate_doors();
else if (selected_part == "tower")
    tower();
else if (selected_part == "connector")
    connector_key();
else if (selected_part == "demo")
    demo();
else
    echo("Unknown part. Use wall, gate, gate_doors, tower, connector, or demo.");
