"""Build the final guide.json from the step timings you recorded in the builder
plus the cleaned-up content below.

Run:  python make_guide.py --force   (rebuilds guide.json from this file; overwrites builder edits)

- Keeps every step's id/start/end from guide.json (or guide.user-original.json).
- The first run saves your hand-written version as guide.user-original.json.
- Content (titles, text, parts, hardware, images) lives in STEPS below; edit it here
  or keep editing in the builder afterwards (the builder preserves all fields).
"""
import json
import sys
import time
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
# CAD downloads stay in their own repo; the guide links to each file's page there
# (GitHub shows a download button, and a 3D viewer for STL). Needs that repo to be public.
CAD_REPO = "https://github.com/tanvir-a0/CogniCare-Assembly-Documentation-2/blob/main/"
CAD_FILES = set(json.loads((HERE / "cad_index.json").read_text(encoding="utf-8"))["files"]) if (HERE / "cad_index.json").exists() else set()


def downloads(name):
    """The CAD formats that repo has for a part (file names; see index_cad.py)."""
    return {fmt: f"{name}.{fmt}" for fmt in ("step", "stl", "f3d", "dxf") if f"{name}.{fmt}" in CAD_FILES}


def P(key, qty=1, infill=None, note=None, fit=False):
    d = {"part": key, "qty": qty}
    if fit: d["fit"] = True
    if infill: d["infill"] = infill
    if note: d["note"] = note
    return d


def H(id, spec=None):
    return {"id": id, **({"spec": spec} if spec else {})}


def DIM(slug, caption):
    return {"src": f"img/dims/{slug}.webp", "caption": caption}


def IMG(name, caption):
    return {"src": f"img/{name}.jpg", "caption": caption}


CHAPTERS = [
    {"id": "frame", "cover": 9, "title": "Base Frame", "summary": "An aluminium box that carries everything else."},
    {"id": "compute", "cover": 18, "title": "Computer Bay", "summary": "A full ITX PC (PSU, motherboard and GPU) inside the base."},
    {"id": "cooling", "cover": 27, "title": "Cooling & Top Frame", "summary": "Airflow, front I/O and the top of the base."},
    {"id": "panels", "cover": 43, "title": "Base Panels", "summary": "Laser-cut acrylic skins, mains wiring and the emergency stop."},
    {"id": "hip", "cover": 50, "title": "Hip Rotation", "summary": "A servo-driven lazy-susan bearing turns the whole body."},
    {"id": "core", "cover": 53, "title": "Core & Torso", "summary": "Four core profiles, the servo supply and the touchscreen mount."},
    {"id": "neck", "cover": 68, "title": "Neck", "summary": "Geared pan and tilt joints driven by two bus servos."},
    {"id": "head", "cover": 80, "title": "Head", "summary": "Visor, eye displays and speakers."},
    {"id": "shell", "cover": 95, "title": "Body Shell", "summary": "Nine printed panels give CogniCare its look."},
]

HARDWARE = {
    "m5-csk": {"name": "M5 countersunk socket screw", "spec": "10 · 12 · 16 · 25 mm", "img": "img/hw-m5-csk.jpg"},
    "tnut": {"name": "M5 drop-in T-nut", "spec": "for 2020 V-slot", "img": "img/hw-tnut.jpg"},
    "m5-nut": {"name": "M5 hex nut", "spec": "8 mm across flats, 4 mm thick", "img": "img/hw-m5-nut.jpg"},
    "m5-low": {"name": "M5 low-profile flat-head screw", "spec": "6 · 10 · 20 mm", "img": "img/hw-m5-lowprofile.jpg"},
    "m5-socket": {"name": "M5 socket head cap screw", "spec": "10 · 12 · 16 mm", "img": "img/hw-m5-socket.jpg"},
    "m5-insert": {"name": "M5 heat-set insert", "spec": "8 mm long, 7 mm OD", "img": "img/hw-m5-insert.jpg"},
    "m3-insert": {"name": "M3 heat-set insert", "spec": "M3 × 5.7, 4.6 mm OD", "img": "img/hw-m3-insert.jpg"},
    "m4-screw": {"name": "M4 screw", "spec": "8 · 10 mm", "img": "img/hw-m4-screw.jpg"},
    "m4-nut": {"name": "M4 hex nut", "spec": "", "img": "img/hw-m4-nut.jpg"},
    "3way": {"name": "3-way corner bracket", "spec": "2020 V-slot", "img": "img/hw-3way-bracket.jpg"},
    "corner": {"name": "Corner bracket", "spec": "2020 V-slot", "img": "img/hw-corner-bracket.jpg"},
    "lazy-susan": {"name": "Lazy-susan bearing", "spec": "10 inch, aluminium", "img": "img/hw-lazy-susan.jpg"},
    "b6007": {"name": "6007 bearing", "spec": "35 × 62 × 14 mm", "img": "img/hw-6007.jpg"},
    "b6804": {"name": "6804-2RS bearing", "spec": "20 × 32 × 7 mm", "img": "img/hw-6804.jpg"},
}

# Tools. Steps refer to them by id; "kit": False keeps an entry out of the kit list.
TOOLS = {
    "hexkeys": {"name": "L-type hex key set", "note": "9 pieces or more: 1.2–6 mm", "img": "img/tool-hex-keys.jpg"},
    "screwdrivers": {"name": "Screwdriver set", "note": "hex, Phillips and flat bits", "img": "img/tool-screwdrivers.jpg"},
    "drill": {"name": "Cordless drill/driver", "note": "with a slip clutch: drive at ~1 Nm, finish by hand", "img": "img/tool-drill.jpg"},
    "printer": {"name": "3D printer", "note": "300 × 300 × 300 mm or larger (we used a Creality K1 Max)", "img": "img/tool-printer.jpg"},
    "laser": {"name": "Laser cutter", "note": "bed of at least 2.5 × 2.5 ft", "img": "img/tool-laser.jpg"},
    "saw": {"name": "Mitre saw", "note": "best for square cuts on the 2020 profiles", "img": "img/tool-mitre-saw.jpg"},
    "hacksaw": {"name": "Hacksaw", "note": "works too: slower, use a mitre box for square ends", "img": "img/tool-hacksaw.jpg"},
    "file": {"name": "Files / deburring tool", "note": "clean up cut profile ends", "img": "img/tool-files.jpg"},
    "calipers": {"name": "Calipers & T-square", "note": "for the spacing checks", "img": "img/tool-calipers.jpg"},
    "solder": {"name": "Soldering iron", "note": "with an insert tip for the heat-set inserts", "img": "img/tool-soldering-iron.jpg"},
    "heatgun": {"name": "Heat gun", "note": "heat-shrink and forming the visor", "img": "img/tool-heat-gun.jpg"},
    "multimeter": {"name": "Multimeter", "note": "check mains and 12 V wiring before powering up", "img": "img/tool-multimeter.jpg"},
    "cutters": {"name": "Wire cutters & strippers", "note": "trim cables and zip ties", "img": "img/tool-wire-cutters.jpg"},
    "pliers": {"name": "Pliers", "note": "holding nuts in tight spots", "img": "img/tool-pliers.jpg"},
    "sandpaper": {"name": "Sandpaper", "note": "to smooth printed parts", "img": "img/tool-sandpaper.jpg"},
    "ptfe": {"name": "PTFE / Scotch tape", "note": "to take up loose tolerances", "img": "img/tool-ptfe.jpg"},
    "zipties": {"name": "Zip ties", "note": "cable management", "img": "img/tool-zipties.jpg"},
    "superglue": {"name": "Super glue", "note": "keeps hex nuts in their slots (never on acrylic)", "img": "img/tool-super-glue.jpg"},
    "glue": {"name": "White craft glue (PVA)", "note": "for the visor: super glue fogs acrylic", "img": "img/tool-craft-glue.jpg"},
    "tape2": {"name": "Double-sided tape", "note": "BusLinker board and eye displays", "img": "img/tool-double-tape.jpg"},
    "etape": {"name": "Electrical tape", "note": "insulation and quick fixes", "img": "img/tool-electrical-tape.jpg"},
    "clothtape": {"name": "Cloth harness tape", "note": "wrap the cable bundle on the umbilical route so it slides smoothly", "img": "img/tool-cloth-tape.jpg"},
    "scraper": {"name": "Utility knife & print scraper", "note": "support removal", "img": "img/tool-scraper.jpg"},
}

KIT = {
    "tools": [dict(v, id=k) for k, v in TOOLS.items() if v.get("kit", True)],
    "materials": [
        {"name": "White Creality Hyper PLA", "note": "every printed part; stick to one brand and colour so the shell matches", "img": "img/mat-filament.jpg"},
        {"name": "2020 aluminium V-slot profile", "note": "about 5.7 m in total, see the cut list"},
        {"name": "3 mm frosted acrylic", "note": "2.5 × 2.5 ft, for the base panels", "img": "img/mat-acrylic-frosted.jpg"},
        {"name": "2–2.5 mm clear acrylic", "note": "1 × 1 ft, for the visor", "img": "img/mat-acrylic-clear.jpg"},
        {"name": "Mains cable, plug & socket", "note": "two 220 V leads: PSU feed and the e-stop circuit"},
        {"name": "Heat-shrink tubing", "note": "for every soldered joint", "img": "img/mat-heatshrink.jpg"},
        {"name": "Soft, flexible HDMI & USB cables", "note": "for the eye displays; they flex with the head", "img": "img/mat-soft-cables.jpg"},
        {"name": "Neodymium magnets 8 × 7 mm", "note": "optional, for the magnetic mic mount", "img": "img/mat-magnets.jpg"},
    ],
    "electronics": [
        {"name": "Hiwonder HX-35HM bus servo", "qty": 3, "img": "img/el-hx35hm.jpg"},
        {"name": "Hiwonder HTD-85H bus servo", "qty": 1, "img": "img/el-htd85h.jpg"},
        {"name": "Hiwonder BusLinker V3.0", "qty": 1, "img": "img/el-buslinker.jpg"},
        {"name": "12 V 10 A SMPS", "qty": 1, "img": "img/el-smps.jpg"},
        {"name": "ViewSonic TD1655 touchscreen", "qty": 1, "img": "img/el-td1655.jpg"},
        {"name": "4-inch HDMI display", "qty": 2, "img": "img/el-hdmi4.jpg"},
        {"name": "52 mm speaker driver", "qty": 2, "img": "img/el-speaker.jpg"},
        {"name": "Boya BY-M1 microphone", "qty": 1, "img": "img/el-mic.jpg"},
        {"name": "AB6-A emergency stop switch", "qty": 1, "img": "img/el-estop.jpg"},
        {"name": "GX16-3 connector (male + female)", "qty": 1, "img": "img/el-gx16.jpg"},
        {"name": "Astra depth camera", "qty": 1, "img": "img/el-astra.jpg"},
        {"name": "Speaker amplifier board", "qty": 1, "note": "we reused the one from the Havit SK717"},
    ],
    "computer": [
        {"name": "AMD Ryzen 5 7500F", "note": "CPU", "img": "img/comp-cpu.jpg"},
        {"name": "MAXSUN B850ITX ICE (Wi-Fi 6)", "note": "Mini-ITX motherboard", "img": "img/comp-motherboard.jpg"},
        {"name": "Kingston FURY Beast 8 GB DDR5-5600", "note": "RAM", "img": "img/comp-ram.jpg"},
        {"name": "Team MP44L 500 GB NVMe", "note": "NVMe SSD", "img": "img/comp-ssd.jpg"},
        {"name": "Gigabyte RTX 3050 OC Low Profile 6 GB", "note": "low-profile GPU", "img": "img/comp-gpu.jpg"},
        {"name": "DeepCool AN600 low-profile cooler", "note": "CPU cooler (must be low profile)", "img": "img/comp-cooler.jpg"},
        {"name": "DeepCool RF120 fan", "note": "120 mm case fan", "img": "img/comp-fan.jpg"},
        {"name": "Corsair CX650 PSU", "note": "650 W ATX, non-modular", "img": "img/comp-psu.jpg"},
        {"name": "Cooler Master 300 mm PCIe 4.0 riser", "note": "PCIe riser cable", "img": "img/comp-riser.jpg"},
        {"name": "DeepCool CH170 front panel (button + USB only)", "note": "only the front I/O board is used from this case", "img": "img/comp-case.jpg"},
    ],
    "cutlist": [
        {"length": 340, "qty": 4, "use": "Base: bottom & top long sides"},
        {"length": 310, "qty": 6, "use": "Base: short sides & inner rails"},
        {"length": 218, "qty": 2, "use": "Base: inner cross rails"},
        {"length": 118, "qty": 4, "use": "Base: corner posts"},
        {"length": 393, "qty": 2, "use": "Core: back columns"},
        {"length": 343, "qty": 2, "use": "Core: front columns"},
    ],
}

# One entry per recorded step, in time order (95 steps).
STEPS = [
    # ---------------------------------------------------------------- BASE FRAME
    dict(ch="frame", action="cut", title="Cut the 340 mm profiles",
         text="Cut **four 340 mm** lengths of 2020 aluminium profile. You need two now; the other two close the top of the base in step 27.",
         tools=["Mitre saw (a hacksaw works too)"], files=["Base Aluminium Profile 340 mm.f3d"],
         tip="Clamp the bars together and deburr the ends so every length matches."),
    dict(ch="frame", action="assemble", title="Add the 3-way corner brackets",
         text="Fit a 3-way corner bracket to both ends of the two 340 mm profiles, using the screws supplied with the brackets. The upright arm of each bracket points **up**: the corner posts slot onto it in step 9.",
         hardware=[H("3way", "×4")], tools=["Hex key set"], files=["Three Way Corner Bracket.f3d"]),
    dict(ch="frame", action="cut", title="Close the bottom rectangle",
         text="Cut **four 310 mm** profiles. Join two of them between the bracketed 340 mm profiles to make a rectangle. Keep the other two for the top frame.",
         hardware=[H("3way")], tools=["Hex key set"], files=["Base Aluminium Profile 310 mm.f3d"]),
    dict(ch="frame", action="check", title="Lower frame done",
         text="The bottom rectangle of the base is complete. Tighten every bracket screw.",
         tip="Measure both diagonals: if they match, the frame is square."),
    dict(ch="frame", action="laser", title="Laser-cut the lower board",
         text="Cut the **Lower Board** from 3 mm acrylic.", cuts=["Lower Board"], tools=["Laser cutter"]),
    dict(ch="frame", action="print", title="Fit the lower board supports",
         text="Print **Lower Board Support 1** and **Lower Board Support 2** and lay them on top of the acrylic. They spread the load so the board doesn't scratch or crack when the robot is moved.",
         prints=[P("Lower Board Support 1"), P("Lower Board Support 2")], hardware=[H("m5-csk"), H("tnut")]),
    dict(ch="frame", action="print", title="Add the feet",
         text="Print **four Feet**, line them up under the corners and fix them with M5 countersunk screws and drop-in T-nuts.",
         prints=[P("Feet", 4)], hardware=[H("m5-csk"), H("tnut")]),
    dict(ch="frame", action="assemble", title="Flip the frame",
         text="Turn the frame over so it stands on its feet."),
    dict(ch="frame", action="cut", title="Stand up the corner posts",
         text="Cut **four 118 mm** profiles and push one onto the upright arm of each 3-way bracket. Tighten with a hex key.",
         tools=["Hex key set"], files=["Base Aluminium Profile 118 mm.f3d"]),

    # ---------------------------------------------------------------- COMPUTER BAY
    dict(ch="compute", action="print", title="Mount the PSU holder",
         text="The base houses a full **ITX PC**. If you use a Jetson, a NUC or another computer you'll need your own mounts; the rest of the build stays the same.\n\nPrint the **Power Supply Holder That Connects with Aluminium Profile** and fix it in one corner with M5 × 10 mm socket screws and drop-in T-nuts. The PSU's power inlet must face a **340 mm** profile.",
         prints=[P("Power Supply Holder That Connects with Aluminium Profile")], hardware=[H("m5-socket", "10 mm"), H("tnut")],
         warning="The holder fits ATX supplies up to 125 × 150 × 86 mm (made for the Corsair CX650).",
         images=[DIM("distance-between-motherboard-base-and-the-118mm-profile", "Distance Between Motherboard Base and the 118mm Profile")]),
    dict(ch="compute", action="install", title="Install the power supply",
         text="Slide the PSU into the holder and screw it in with the screws from the PSU box. We used a **Corsair CX650** (650 W, 80+ Bronze). Any unit of the same size with **non-modular** cables will do.",
         components=["Corsair CX650 PSU"], files=["EL90045--STD--ATX Power Supply v1.f3d"]),
    dict(ch="compute", action="print", title="Add the PSU exhaust guide",
         text="Print the **PSU Exhust Air Guide** and fit it over the PSU's exhaust grille. It sends hot air out of the base instead of letting it circulate back in. Fix it with one countersunk screw and a drop-in T-nut.",
         prints=[P("PSU Exhust Air Guide")], hardware=[H("m5-csk"), H("tnut")]),
    dict(ch="compute", action="print", title="Cover the PSU intake",
         text="Print the **PSU Shield** and tape (or lightly glue) it over the PSU's intake. It stops screws and debris falling into the PSU while you build.",
         prints=[P("PSU Shield")], tools=["Electrical tape or glue"]),
    dict(ch="compute", action="check", title="Next: the motherboard",
         text="Power is in place. Next comes the motherboard."),
    dict(ch="compute", action="print", title="Print the motherboard base",
         text="Print the **Motherboard Base** and melt **M3 heat-set inserts** into its four mounting holes. Bolt it to the 340 mm profile with M5 countersunk screws, keeping the spacing below so the motherboard's I/O lines up with the side panel.",
         prints=[P("Motherboard Base")], hardware=[H("m3-insert", "×4"), H("m5-csk"), H("tnut")],
         images=[IMG("dim-motherboard", "Motherboard holder and backplate support spacing")]),
    dict(ch="compute", action="print", title="Add the motherboard supports",
         text="Print **Motherboard Support Left** and **Motherboard Support Right** and join them to the base with M5 countersunk screws and nuts (M5 inserts work too). They hold the far end of the board so it can't sag. Leave their **top ends free**: they bolt to the top frame in step 27.",
         prints=[P("Motherboard Support Left"), P("Motherboard Support Right")], hardware=[H("m5-csk"), H("m5-nut")]),
    dict(ch="compute", action="install", title="Fit the motherboard",
         text="Screw the ITX motherboard, with CPU and cooler already fitted, onto the inserts. Use a **low-profile cooler** so it fits under the top frame.",
         components=["MAXSUN B850ITX ICE (Wi-Fi 6)", "DeepCool AN600 low-profile cooler"]),
    dict(ch="compute", action="print", title="Snap on the fan guard",
         text="Print the **120mm Cooling Fan Gurd Mainly for CPU Cooler Fans**. It snap-fits over the cooler fan.",
         prints=[P("120mm Cooling Fan Gurd Mainly for CPU Cooler Fans")]),
    dict(ch="compute", action="check", title="Next: the GPU",
         text="The motherboard is done. Now the graphics card."),
    dict(ch="compute", action="print", title="Print the GPU holder",
         text="Print **GPU Holder Main**. Melt **M3 inserts** into the two small holes and **M5 inserts** into the larger ones. Then screw the slot end of the PCIe riser into the lower part.",
         prints=[P("GPU Holder Main")], hardware=[H("m3-insert", "×2"), H("m5-insert", "×2")],
         components=["Cooler Master 300 mm PCIe 4.0 riser"], files=["Cooler Master PCIe 4.0 x16 300mm Riser Cable.f3d"]),
    dict(ch="compute", action="print", title="Fit the GPU mounting parts",
         text="Print **GPU Holder Mounting Parts**. Of its four holes, bolt the **centre two** to the GPU's bracket, matching the wedge on the print to the bracket.",
         prints=[P("GPU Holder Mounting Parts")],
         warning="Use a **low-profile GPU** fitted with its small-form-factor bracket. We used a Gigabyte RTX 3050 OC Low Profile 6 GB."),
    dict(ch="compute", action="install", title="Seat the GPU",
         text="Push the GPU into the riser's PCIe slot and check it's fully seated. The outer side of the mounting part lines up with the M5 inserts in **GPU Holder Main**: fix it there with M5 × 10 mm screws.",
         hardware=[H("m5-socket", "10 mm")]),
    dict(ch="compute", action="print", title="Add the GPU support",
         text="Print **GPU Holder Additional Support** and bolt it on with M5 screws and hex nuts. It locks the card in place so it can't work loose in transport.",
         prints=[P("GPU Holder Additional Support")], hardware=[H("m5-nut")]),
    dict(ch="compute", action="install", title="Mount the GPU assembly",
         text="Lower the whole GPU assembly into the base and fix it to the 310 mm profiles with M5 countersunk screws. Before tightening the screws, push it **as close as possible to the 340 mm profiles**. Leave room for the HDMI cable.",
         hardware=[H("m5-csk"), H("tnut")]),

    # ---------------------------------------------------------------- COOLING & TOP FRAME
    dict(ch="cooling", action="print", title="Install the case fan",
         text="One 120 mm fan cools the base. Screw it to the printed **Fan Mount With Aluminium Profile**, then fix the mount to the lower 310 mm profile with M5 countersunk screws. Fit **only the lower screws** for now; the top profile isn't on yet.",
         prints=[P("Fan Mount With Aluminium Profile")], hardware=[H("m5-csk"), H("tnut")],
         components=["DeepCool RF120 fan"], files=["120mm_fan_asm v1.f3d"],
         images=[DIM("distance-between-the-fan-mount-and-the-118mm-profile", "Distance between the Fan Mount and the 118mm Profile")]),
    dict(ch="cooling", action="print", title="Add the fan inlet guide",
         text="Print the **120mm Fan Inlet Air Guide** and fit it in front of the fan with two M5 countersunk screws and drop-in T-nuts. The fan is an **intake**, and the guide makes it pull fresh air from outside instead of re-breathing warm air from inside the base.",
         prints=[P("120mm Fan Inlet Air Guide")], hardware=[H("m5-csk", "×2"), H("tnut", "×2")]),
    dict(ch="cooling", action="assemble", title="Close the top of the base",
         text="Build a second rectangle from the remaining **two 310 mm** and **two 340 mm** profiles with 3-way brackets and set it on the corner posts.\n\nNow fit the screws you left out earlier: the two at the top of the motherboard supports and the top screw of the fan mount.",
         hardware=[H("3way", "×4")]),
    dict(ch="cooling", action="print", title="Build the front I/O module",
         text="Print **Power Menu Connector Top Part** (melt in an M5 insert) and **Power Menu Connector Lower Part**. Clamp the front-panel board (power button, audio and USB) between them.",
         prints=[P("Power Menu Connector Top Part"), P("Power Menu Connector Lower Part")], hardware=[H("m5-insert")],
         tip="Ours came from a DeepCool CH170 case. A different front panel needs its own holder."),
    dict(ch="cooling", action="install", title="Mount the front I/O",
         text="Fix the I/O module to the top 340 mm profile with M5 countersunk screws and drop-in T-nuts.",
         hardware=[H("m5-csk"), H("tnut")],
         images=[DIM("distance-between-power-menu-connector-top-and-the-118mm-profile", "Distance between Power Menu Connector Top and the 118mm Profile")]),
    dict(ch="cooling", action="print", title="Add the backplate cover",
         text="Print the **Motherboard Backplate** cover. It sits over the motherboard and leaves a clear path for hot air to escape. Fix it with two M5 countersunk screws and drop-in T-nuts.",
         prints=[P("Motherboard Backplate")], hardware=[H("m5-csk", "×2"), H("tnut", "×2")],
         images=[DIM("distance-between-motherboard-back-plate-and-the-118mm-profile", "Distance Between Motherboard Back Plate and the 118mm Profile")]),
    dict(ch="cooling", action="wire", title="Wire the PC",
         text="Connect the CPU, GPU and PSU cables now. The outer panels go on next and make access much harder.",
         tip="Power it on once and check everything works before closing it up. Having someone experienced check your cable routing helps."),

    # ---------------------------------------------------------------- BASE PANELS
    dict(ch="panels", action="laser", title="Cut the I/O side panel",
         text="Laser-cut the **Right Board (Motherboard IO Side)** from 3 mm acrylic. It has a cut-out for the GX16 connector.",
         cuts=["Right Board (Motherboard IO Side)"]),
    dict(ch="panels", action="print", title="Mount the GX16 socket",
         text="Print the **GX 16 Holder** and fix the **male GX16-3** connector in it with its own nut. Then bolt the holder to the panel with M5 screws and nuts.",
         prints=[P("GX 16 Holder")], hardware=[H("m5-nut")], components=["GX16-3 connector (male)"], files=["GX 16-3 Male.f3d"]),
    dict(ch="panels", action="assemble", title="Fit the I/O side panel",
         text="Print two **Screw Support for Board Small**, lay them along the panel edge and fix the panel to the frame with four M5 countersunk screws and drop-in T-nuts.\n\nThen add the printed **Updated GPU Backplate v1** with the same screws and nuts.",
         prints=[P("Screw Support for Board Small", 2), P("Updated GPU Backplate v1")], hardware=[H("m5-csk", "×4"), H("tnut", "×4")],
         warning="Wire the GX16 connector **before** closing up. It carries mains power from the emergency stop you'll fit later."),
    dict(ch="panels", action="laser", title="Fit the back panel",
         text="Laser-cut the **Back Board** and **Front Board**. Fix the back board to the frame with the **Screw Support for Board Large**.",
         cuts=["Back Board", "Front Board"], prints=[P("Screw Support for Board Large", 2)], hardware=[H("m5-csk"), H("tnut")]),
    dict(ch="panels", action="laser", title="Fit the left panel & power inlet",
         text="Laser-cut the **Left Board** and press-fit the printed **AC Power Enter Hole** into it.\n\nTwo mains cables pass through here: one powers the PC, the other runs through the emergency stop to the GX16 socket. Leave both long.",
         cuts=["Left Board"], prints=[P("AC Power Enter Hole")]),
    dict(ch="panels", action="laser", title="Fit the front panel",
         text="Fix the **Front Board** with **Screw Support for Board Small**, four M5 countersunk screws and drop-in T-nuts.",
         prints=[P("Screw Support for Board Small", 2)], hardware=[H("m5-csk", "×4"), H("tnut", "×4")]),
    dict(ch="panels", action="cut", title="Add the inner 310 mm rails",
         text="Cut **two more 310 mm** profiles and fit them inside the top frame with **corner brackets**, M5 screws and drop-in T-nuts. Keep **66 mm between outer faces** and **26 mm between inner faces** to the neighbouring profile.\n\nThis spacing needs to be as accurate as possible, so use **Aluminium Profile Spacing Measurement Helper 1** and **Aluminium Profile Spacing Measurement Helper 2** to space the two profiles exactly.",
         hardware=[H("corner"), H("tnut")], images=[IMG("dim-base-66mm", "66 mm between outer faces"), IMG("dim-base-26mm", "26 mm between inner faces"), DIM("applying-spacing-helper-1-and-2", "Applying spacing helper 1 and 2")],
         prints=[P("Aluminium Profile Spacing Measurement Helper 1", note="optional"), P("Aluminium Profile Spacing Measurement Helper 2", note="optional")],
         tip="Remove the spacing helpers once the screws are tight."),
    dict(ch="panels", action="cut", title="Add the 218 mm cross rails",
         text="Cut **two 218 mm** profiles and join them to the inner rails with corner brackets, keeping the same **26 mm / 66 mm** spacing. Use the dimensions from step 38 to place the profiles accurately.",
         hardware=[H("corner"), H("tnut")], files=["Base Aluminium Profile 218 mm.f3d"]),
    dict(ch="panels", action="print", title="Fit the components protector",
         text="Print the **Protector for PC Components** and fix it with M5 screws and drop-in T-nuts. Its many holes make cable management easy.",
         prints=[P("Protector for PC Components")], hardware=[H("tnut")],
         warning="Match the orientation shown in the animation: the **flat side** of the Protector for PC Components faces the **PSU and cooling fan** side."),
    dict(ch="panels", action="laser", title="Lay the top board",
         text="Laser-cut the **Top Board** and lay it on the frame. The **square cut-out** must sit on the GPU/fan side: the emergency-stop cable is routed through it.",
         cuts=["Top Board"]),
    dict(ch="panels", action="wire", title="Top supports & emergency stop",
         text="Print four **Top Board Screw Support** and fix the top board with M5 countersunk screws and drop-in T-nuts.\n\nPrint the **Emergency Switch Holder**, mount the **AB6-A emergency stop** and solder its wires:\n\n- One 220 V cable feeds the PSU directly.\n- A second 220 V cable enters through the AC inlet, runs through the emergency stop and on to the GX16 socket.",
         prints=[P("Top Board Screw Support", 4), P("Emergency Switch Holder")], hardware=[H("m5-csk"), H("tnut")],
         components=["AB6-A emergency stop"], files=["AB6-A Emergency Switch.f3d"],
         warning="This is **mains voltage**. Insulate every joint with heat-shrink and test with the plug out."),
    dict(ch="panels", action="print", title="Add the main body lifters",
         text="Print four **Updated Main Body Lifter Support** and fix one in each corner inside the top frame with countersunk screws and drop-in T-nuts.",
         prints=[P("Updated Main Body Lifter Support", 4)], hardware=[H("m5-csk"), H("tnut")]),

    # ---------------------------------------------------------------- HIP
    dict(ch="hip", action="print", title="Print the motor bearing holder",
         text="Print one **Lazy Susan Bearing Holder with Servo Motor**. It carries the hip motor.",
         prints=[P("Lazy Susan Bearing Holder with Servo Motor")]),
    dict(ch="hip", action="install", title="Fit the hip servo",
         text="Fit a **Hiwonder HTD-85H** (the version with the round output shaft) into the holder and secure it with the six screws under the servo.",
         components=["Hiwonder HTD-85H"], files=["HTD-85H.f3d"],
         tip="Set this servo's ID to **1** before you build it in."),
    dict(ch="hip", action="print", title="Add the hip driver gear",
         text="Print the **Hip Driver Gear** at about **60 % infill** and fix it to the servo shaft with the screws supplied with the HTD-85H.",
         prints=[P("Hip Driver Gear", infill="60%")]),
    dict(ch="hip", action="print", title="Print the second bearing holder",
         text="Print one **Lazy Susan Bearing Holder Without Motor**.",
         prints=[P("Lazy Susan Bearing Holder Without Motor")]),
    dict(ch="hip", action="assemble", title="Mount the lazy-susan bearing",
         text="Lay the **10-inch lazy-susan bearing** over both holders: they line up with its outer ring. Join them with long screws.\n\nT-nut slots at the holder ends let you unbolt the whole upper robot (hip to head) whenever you like and park it on the printed **Robot Temporary Base During Transportation**.",
         hardware=[H("lazy-susan")], prints=[P("Robot Temporary Base During Transportation", note="optional")],
         tip="To fix the robot permanently, set the holders in the profile beside the main body lifters and bolt them down with T-nuts and M5 screws."),
    dict(ch="hip", action="assemble", title="Rest it on the base",
         text="Set the bearing assembly into the profile slots. Don't fix it yet: many screws still have to go in."),
    dict(ch="hip", action="print", title="Stack the hip layers",
         text="Stack these over the bearing, lining up the four holes:\n\n1. **Inner Driven Gear of Hip**: print at more than 60 % infill\n2. **Mesh Protecting Part**\n3. **Core Support**\n\nBolt all the layers together with M5 screws from the top and M5 hex nuts underneath.",
         prints=[P("Inner Driven Gear of Hip", infill="60%+"), P("Mesh Protecting Part"), P("Core Support")],
         hardware=[H("m5-csk", "25 mm"), H("m5-nut")],
         tip="The gear fits the bearing very tightly. That's intentional."),

    # ---------------------------------------------------------------- CORE
    dict(ch="core", action="cut", title="Raise the core profiles",
         text="Four 2020 profiles carry the whole upper body: **343 mm at the front** and **393 mm at the back**. Seat them in the **Core Support**, making sure each profile sits fully inside its hole, and fix them with M5 countersunk screws and drop-in T-nuts. The four outer holes are enough; the inner ones are spare.",
         hardware=[H("m5-csk", "12 mm"), H("tnut")], images=[IMG("dim-core-height", "Core profile heights")],
         files=["Croe Profile Front Left.f3d", "Croe Profile Front Right.f3d", "Croe Profile Back Left.f3d", "Croe Profile Back Right.f3d"]),
    dict(ch="core", action="wire", title="Mount the 12 V servo supply",
         text="The **12 V 10 A SMPS** powers the servos.\n\n- Wire it first: a **long** AC lead (it ends in a GX16 female plug that connects to the base) and a **short** DC lead (the servo controller sits right on top).\n- Fix **12V SMPS Holder Lower Part** at the cable end using the supply's M3 holes (or its slots with M3 nuts), then fit **12V SMPS Holder Upper Part**.\n- Mount the assembly on the **back** (longer) profiles with M5 countersunk screws and drop-in T-nuts, leaving the 1 mm clearance shown.\n- Stick the **Hiwonder BusLinker V3.0** to the upper holder with double-sided tape.",
         prints=[P("12V SMPS Holder Lower Part"), P("12V SMPS Holder Upper Part")], hardware=[H("m4-screw"), H("m4-nut"), H("m5-csk", "10 mm"), H("tnut")],
         components=["12 V 10 A SMPS", "Hiwonder BusLinker V3.0", "GX16-3 connector (female)"], images=[DIM("distance-between-smps-holder-lower-and-core-support", "Distance between SMPS Holder Lower and Core Support"), IMG("dim-smps", "1 mm clearance for tolerance")]),
    dict(ch="core", action="print", title="Fit the lower panel connectors",
         text="Print **Left Lower Generated Connector** and **Right Lower Generated Connector** at **40 % infill** or more. Press M5 hex nuts into every hex slot; a drop of super glue keeps them there. Fix one to each side of the core with M5 screws and drop-in T-nuts.",
         prints=[P("Left Lower Generated Connector", infill="40%"), P("Right Lower Generated Connector", infill="40%")], hardware=[H("m5-nut"), H("tnut")],
         images=[DIM("distance-between-left-lower-connection-and-core-support", "Distance between Left Lower Connection and Core Support")]),
    dict(ch="core", action="print", title="Build the display mount",
         text="The mount is made for a **ViewSonic TD1655**. For a different screen, only the holder needs redesigning. Print **Display Connector with Core Profiles - Lower**, **Display Connector with Core Profiles - Upper** and the **ViewSonic TD1655 Display Holder**, and join them with M5 × 25 mm countersunk screws and hex nuts.",
         prints=[P("Display Connector with Core Profiles - Lower"), P("Display Connector with Core Profiles - Upper"), P("ViewSonic TD1655 Display Holder")],
         hardware=[H("m5-csk", "25 mm"), H("m5-nut")], files=["ViewSonic TD1655 Simplified Model.f3d"],
         tip="Leave the lower two holes empty. They're reserved for future add-ons."),
    dict(ch="core", action="install", title="Install the display mount",
         text="Take the SMPS assembly off, then slide the display mount down over the core profiles from the top. Fix all four sides with M5 flat-head screws and drop-in T-nuts.",
         hardware=[H("m5-low"), H("tnut")], images=[DIM("distance-between-display-connector-lower-upper-and-the-core-support", "Distance between Display Connector Lower, Upper and the Core Support")]),
    dict(ch="core", action="print", title="Add a wire guide",
         text="Print the small **Wire Guide - Small Version** and fit it at any convenient spot on the two back profiles. Zip-tie cables through its holes.",
         prints=[P("Wire Guide - Small Version")]),
    dict(ch="core", action="print", title="Fit the neck base",
         text="Print the **Entire Head Support and Neck Pan Motor Holder**, slide it onto the core profiles from the top and fix it with M5 flat-head screws and drop-in T-nuts. Its servo mount faces the robot's **left**.",
         prints=[P("Entire Head Support and Neck Pan Motor Holder")], hardware=[H("m5-low"), H("tnut")],
         images=[IMG("dim-neck-3", "Neck base offset from the aluminium profiles")]),
    dict(ch="core", action="print", title="Fit the upper panel connectors",
         text="Print **Left Upper Generated Connector** and **Right Upper Generated Connector** at **40 % infill** or more. Press M5 hex nuts into the hex slots (a drop of super glue helps) and fix one to each side of the core with M5 screws and drop-in T-nuts.",
         prints=[P("Left Upper Generated Connector", infill="40%"), P("Right Upper Generated Connector", infill="40%")], hardware=[H("m5-nut"), H("tnut")],
         images=[DIM("left-right-upper-generated-connector-distance-from-top-of-profile-1", "Left Right Upper Generated Connector Distance From Top of Profile 1"),
                 DIM("left-right-upper-generated-connector-distance-from-top-of-profile-2", "Left Right Upper Generated Connector Distance From Top of Profile 2")]),

    # ---------------------------------------------------------------- NECK
    dict(ch="neck", action="print", title="Build the pan drive",
         text="Fit an **HX-35HM** servo with its round horn and screw the printed **Neck Pan Gear Driver** onto it.",
         prints=[P("Neck Pan Gear Driver")], components=["Hiwonder HX-35HM"], files=["Hiwonder HX-35HM.f3d"],
         tip="This is the **pan** servo: give it ID **5**."),
    dict(ch="neck", action="install", title="Install the pan servo",
         text="Drop the servo into its slot and fix it with the screws from underneath.",
         tip="If it wobbles, wrap a little PTFE or Scotch tape around it."),
    dict(ch="neck", action="print", title="Stack the pan bearing",
         text="Press the **6007 bearing** into place, then stack:\n\n1. **Support for Neck Pan Gear Driven** (60 % infill)\n2. **Neck Pan Gear Driven** (60 % infill)\n3. **Neck Pan and Tilt Part Connection** (40 % infill)\n\nFour long screws from the top of the connector hold the stack. They thread straight into the plastic, so no nuts are needed. The hole through the bearing centre carries one servo cable.",
         prints=[P("Support for Neck Pan Gear Driven", infill="60%"), P("Neck Pan Gear Driven", infill="60%"), P("Neck Pan and Tilt Part Connection", infill="40%")],
         hardware=[H("b6007"), H("m5-csk", "25 mm")],
         warning="The snug fit on the 6007 bearing carries the whole head. If it's loose, add PTFE tape until it's tight."),
    dict(ch="neck", action="print", title="Build the tilt drive",
         text="Fit a second **HX-35HM** with its round horn and screw on the printed **Neck Tilt Gear Driver**.",
         prints=[P("Neck Tilt Gear Driver")], components=["Hiwonder HX-35HM"], files=["HX-35HM Horn Connector.f3d"],
         tip="This is the **tilt** servo: give it ID **4**."),
    dict(ch="neck", action="install", title="Install the tilt servo",
         text="Fit the tilt servo into its slot in the Neck Pan and Tilt Part Connection and screw it in. Then connect all the servos to the BusLinker."),
    dict(ch="neck", action="install", title="Press in the tilt bearings",
         text="Press a **6804-2RS bearing** into each side of the Neck Pan and Tilt Part Connection.",
         hardware=[H("b6804", "×2")]),
    dict(ch="neck", action="print", title="Left head joint & tilt gear",
         text="Fit the **Neck Tilt Left Head Joint** into the left bearing (left from the robot's point of view). Bolt the **Neck Tilt Gear Driven** to it with long M5 flat-head screws and M5 nuts in the hex slots.",
         prints=[P("Neck Tilt Left Head Joint"), P("Neck Tilt Gear Driven")], hardware=[H("m5-low", "20 mm"), H("m5-nut")]),
    dict(ch="neck", action="print", title="Right head joint",
         text="Fit the **Neck Tilt Right Head Joint** into the right bearing.",
         prints=[P("Neck Tilt Right Head Joint")]),
    dict(ch="neck", action="print", title="Bridge the head joints",
         text="Print the **Left Right Head Joint Connector** at **60 % infill** and join the two joints with M5 flat-head screws and nuts. There are six holes, but four screws are enough. The left side is a tight squeeze.",
         prints=[P("Left Right Head Joint Connector", infill="60%")], hardware=[H("m5-low", "20 mm"), H("m5-nut")]),
    dict(ch="neck", action="print", title="Add the head pivots",
         text="Print the **Head Front Connector** and **Head Back Connector** and fix them to the bridge with M5 screws and hex nuts.",
         prints=[P("Head Front Connector"), P("Head Back Connector")], hardware=[H("m5-nut")],
         tip="Glue the hex nuts into the back pivot's slots so they stay put."),

    # ---------------------------------------------------------------- HEAD
    dict(ch="head", action="print", title="Print the head front",
         text="Print the **Head Front with Ribs** at **40 % infill**, front face down on the bed, with plenty of supports. Sand it smooth afterwards.",
         prints=[P("Head Front with Ribs", infill="40%")], tools=["Sandpaper"],
         warning="Print orientation matters here: face down, fully supported."),
    dict(ch="head", action="install", title="Add the head inserts",
         text="Melt **M5 heat-set inserts** into the holes in the **Head Front with Ribs**. Most head parts screw into them.",
         hardware=[H("m5-insert")]),
    dict(ch="head", action="print", title="Make the visor",
         text="The visor is a curved sheet of 2–2.5 mm clear acrylic.\n\n1. Print the **Eye Glass or Visor** part (it is the mould).\n2. Heat the acrylic with a heat gun and press it over the mould (a thin cloth in between avoids marks).\n3. Trim it to shape and glue it to the printed **Visor Holder**.",
         prints=[P("Eye Glass or Visor", note="mould"), P("Visor Holder")], tools=["Heat gun"],
         warning="Don't use super glue on acrylic. It fogs the surface."),
    dict(ch="head", action="install", title="Mount the visor",
         text="Screw the visor assembly to the head with M5 × 12 mm countersunk screws.",
         hardware=[H("m5-csk", "12 mm")]),
    dict(ch="head", action="print", title="Build the speakers",
         text="Print the **Left Speaker Holder** and **Right Speaker Holder** and fix a 52 mm driver in each with M4 screws. Ours are the 3 W drivers from a Havit SK717; any driver that fits will do.",
         prints=[P("Left Speaker Holder"), P("Right Speaker Holder")], hardware=[H("m4-screw")], components=["52 mm speaker driver ×2"]),
    dict(ch="head", action="install", title="Mount the first speaker",
         text="Screw the speaker into the inserts inside the head with 12 mm M5 screws. Use 25 mm screws in the two holes it shares with the display holder.",
         hardware=[H("m5-csk", "12 · 25 mm")]),
    dict(ch="head", action="install", title="Mount the second speaker",
         text="Repeat on the other side."),
    dict(ch="head", action="print", title="Install the eye displays",
         text="Two **4-inch HDMI displays** form the eyes. Print the **Left Display Holder** and **Right Display Holder**, fix the displays in with glue or double-sided tape (HDMI port towards the cut-out), then push each holder into place and screw it in.",
         prints=[P("Left Display Holder"), P("Right Display Holder")], components=["4-inch HDMI display ×2"],
         tip="One display screw shares a hole with the speaker, so you may need to take the speaker holder off first. Dark filament and a tinted visor look great here.",
         warning="Use **soft, flexible** HDMI and USB cables. Stiff cables fight the head as it moves."),
    dict(ch="head", action="install", title="Join the head to the pivot",
         text="Attach the head assembly to the **Head Front Connector** with four 12 mm M5 countersunk screws.",
         hardware=[H("m5-csk", "12 mm")]),
    dict(ch="head", action="print", title="Build the head back",
         text="Print the **Head Back** and the **Head Top Camera Holder** and join them with M5 countersunk screws and hex nuts. The cover closes the hole on top. Swap it out if you add a head camera later.",
         prints=[P("Head Back"), P("Head Top Camera Holder")], hardware=[H("m5-csk"), H("m5-nut")]),
    dict(ch="head", action="install", title="Close the head",
         text="Fix the **Head Back** to the **Head Back Connector** and the **Head Front with Ribs** with 16 mm M5 countersunk screws.",
         hardware=[H("m5-csk", "16 mm")]),
    dict(ch="head", action="wire", title="Route the head cables",
         text="Run all the head cables down into the body through the opening behind the neck. Tilt the head through its full range to check nothing snags, then zip-tie them."),

    # ---------------------------------------------------------------- SHELL
    dict(ch="shell", action="print", title="Print the nine body panels",
         text="Nine panels make the outer shell. Start them early: they're the longest prints in the build. Each one fixes to the panel connectors with **16 mm M5 countersunk screws** into the hex nuts.",
         prints=[P("Lower Midsection"), P("Midsection"), P("Upper Midsection"), P("Rear Section with Umbilical Cord Hole"), P("Upper Rear Section"),
                 P("Left Sholder Back"), P("Left Sholder Front"), P("Right Sholder Back"), P("Right Sholder Front")],
         hardware=[H("m5-csk", "16 mm")]),
    dict(ch="shell", action="assemble", title="Fit the Lower Midsection", text="Fit the **Lower Midsection** first.",
         prints=[P("Lower Midsection", fit=True)]),
    dict(ch="shell", action="assemble", title="Fit the Midsection", text="Then the **Midsection** above it.",
         prints=[P("Midsection", fit=True)]),
    dict(ch="shell", action="print", title="Fit the Left Hole Filler With LEDs",
         text="Print the **Left Hole Filler With LEDs** and fix it into the left opening of the **Rear Section with Umbilical Cord Hole** with M5 countersunk screws and hex nuts.",
         prints=[P("Left Hole Filler With LEDs")], hardware=[H("m5-csk"), H("m5-nut")]),
    dict(ch="shell", action="print", title="Fit the Right Umbilical Cord Hole",
         text="Fit the **Right Umbilical Cord Hole** into the right opening the same way. Every cable from the upper body leaves through here to the base.",
         prints=[P("Right Umbilical Cord Hole")], hardware=[H("m5-csk"), H("m5-nut")]),
    dict(ch="shell", action="assemble", title="Attach the Rear Section with Umbilical Cord Hole",
         text="Fix the assembled **Rear Section with Umbilical Cord Hole** to the robot with M5 countersunk screws.",
         prints=[P("Rear Section with Umbilical Cord Hole", fit=True)]),
    dict(ch="shell", action="assemble", title="Attach the Right Sholder Back", text="Attach the **Right Sholder Back**.",
         prints=[P("Right Sholder Back", fit=True)]),
    dict(ch="shell", action="assemble", title="Attach the Left Sholder Back", text="Attach the **Left Sholder Back**.",
         prints=[P("Left Sholder Back", fit=True)]),
    dict(ch="shell", action="assemble", title="Attach the Upper Rear Section", text="Attach the **Upper Rear Section**.",
         prints=[P("Upper Rear Section", fit=True)]),
    dict(ch="shell", action="assemble", title="Attach the Upper Midsection", text="Attach the **Upper Midsection**.",
         prints=[P("Upper Midsection", fit=True)]),
    dict(ch="shell", action="assemble", title="Attach the Left Sholder Front", text="Attach the **Left Sholder Front**.",
         prints=[P("Left Sholder Front", fit=True)]),
    dict(ch="shell", action="assemble", title="Attach the Right Sholder Front", text="Attach the **Right Sholder Front**.",
         prints=[P("Right Sholder Front", fit=True)]),
    dict(ch="shell", action="print", title="Mount the chest camera",
         text="Fit the **Astra Camera Holder**, designed for an Astra depth camera.",
         prints=[P("Astra Camera Holder")]),
    dict(ch="shell", action="install", title="Mount the display",
         text="Slide the TD1655's aluminium back plate into the display mount.\n\nOptional: print the **Monitor Magnetic Mount For Microphone And Additional Small Camera**, press in 8 × 7 mm neodymium magnets with a drop of glue, and clip a Boya BY-M1 microphone into it on top of the screen.",
         prints=[P("Monitor Magnetic Mount For Microphone And Additional Small Camera", note="optional")], components=["ViewSonic TD1655", "Boya BY-M1 microphone"]),
    dict(ch="shell", action="check", title="CogniCare is complete",
         text="Connect everything and test it: the servos, the eye animation and the camera. Then enjoy your robot."),
]


# ---------------------------------------------------------------- gap filling
ROUTE = ("**Plan the cable route before you wire anything in the body.** Every cable from the upper body "
         "(servo bus, 12 V supply, eye displays, speakers, camera, microphone) runs down the back core profiles, "
         "out through the **Right Umbilical Cord Hole** in the **Rear Section with Umbilical Cord Hole** and into the **I/O panel** on the side of the base. "
         "Keep that path clear, and leave a generous slack loop between body and base so nothing gets yanked when the hip rotates.")

# extra tools / components / notes per step number (1-based), on top of the automatic tools below
ENRICH = {
    1: dict(tools=["file", "calipers"]),
    3: dict(tools=["saw", "file"]),
    4: dict(tools=["calipers"]),
    5: dict(components=["3 mm frosted acrylic sheet"]),
    9: dict(tools=["saw", "file"]),
    11: dict(tools=["screwdrivers"]),
    17: dict(tools=["screwdrivers"], components=["AMD Ryzen 5 7500F", "Kingston FURY Beast 8 GB DDR5", "Team MP44L 500 GB NVMe"],
             tip="Fit the CPU, cooler, RAM and SSD on the bench first. It's much harder once the board is in the base."),
    20: dict(tools=["screwdrivers"]),
    21: dict(tools=["screwdrivers"], components=["Gigabyte RTX 3050 OC Low Profile 6 GB"]),
    25: dict(tools=["screwdrivers"]),
    28: dict(tools=["screwdrivers"], components=["DeepCool CH170 front panel"]),
    31: dict(tools=["zipties", "screwdrivers"], components=["PSU cables: 24-pin ATX, 8-pin CPU, PCIe power", "Front-panel and fan connectors"],
             tip2="Keep the motherboard's I/O side clear. The cables coming down from the robot's body plug in there later."),
    32: dict(components=["3 mm frosted acrylic sheet"]),
    33: dict(tools=["pliers"]),
    34: dict(tools=["solder", "cutters", "heatgun"]),
    35: dict(components=["3 mm frosted acrylic sheet"]),
    36: dict(components=["3 mm frosted acrylic sheet", "Two 220 V mains cables"]),
    38: dict(tools=["saw", "file", "calipers"]),
    39: dict(tools=["saw", "file", "calipers"]),
    40: dict(tools=["zipties"]),
    41: dict(components=["3 mm frosted acrylic sheet"]),
    42: dict(tools=["solder", "heatgun", "cutters", "multimeter"], components=["220 V mains cable, plug & socket", "Heat-shrink tubing"]),
    45: dict(tools=["screwdrivers"]),
    46: dict(tools=["screwdrivers"]),
    48: dict(tools=["hexkeys"]),
    50: dict(tools=["pliers"]),
    51: dict(tools=["saw", "file", "calipers"]),
    52: dict(tools=["screwdrivers", "cutters", "tape2", "multimeter"], components=["Long AC lead (to the GX16 plug)", "Short 12 V DC leads"],
             warning2=ROUTE),
    53: dict(tools=["superglue", "pliers"]),
    56: dict(tools=["zipties"]),
    57: dict(tools=["calipers"]),
    58: dict(tools=["superglue", "pliers"]),
    59: dict(tools=["screwdrivers"]),
    60: dict(tools=["screwdrivers", "ptfe"]),
    61: dict(tools=["ptfe"]),
    62: dict(tools=["screwdrivers"]),
    63: dict(tools=["screwdrivers", "zipties"], components=["Servo bus cables"],
             tip2="Feed the pan servo's cable through the hole in the 6007 bearing, then down the back profiles. Leave enough slack for the head to pan and tilt through its full range."),
    64: dict(tools=["ptfe"]),
    65: dict(tools=["pliers"]),
    67: dict(tools=["pliers"]),
    68: dict(tools=["superglue"]),
    69: dict(tools=["scraper"]),
    71: dict(tools=["glue"], components=["2–2.5 mm clear acrylic sheet"]),
    73: dict(tools=["screwdrivers", "solder"], components=["Speaker amplifier board (from the Havit SK717)"]),
    75: dict(tools=["hexkeys"]),
    76: dict(tools=["tape2", "glue"], components=["Soft HDMI cable ×2", "Soft USB cable ×2"]),
    80: dict(tools=["zipties", "clothtape"],
             tip2="Carry on down the same path: behind the neck, along the back core profiles, to the umbilical cord port. Leave slack at the neck **and** above the hip."),
    81: dict(tools=["scraper", "sandpaper"]),
    84: dict(components=["LEDs for the filler (your choice)"]),
    85: dict(tools=["clothtape", "zipties"], tip2="Pass every upper-body cable through this port before you fit it, then run them into the base's I/O panel. Leave a slack loop here so the hip can turn without pulling on anything."),
    93: dict(components=["Astra depth camera"]),
    94: dict(tools=["superglue"]),
}
SHELL_ATTACH = {82, 83, 86, 87, 88, 89, 90, 91, 92}   # outer panels: always M5 countersunk

OLD_TOOL_NAMES = {"Mitre saw (a hacksaw works too)": "saw", "Hex key set": "hexkeys", "Laser cutter": "laser",
                  "Electrical tape or glue": "etape", "Sandpaper": "sandpaper", "Heat gun": "heatgun"}


def enrich(n, s, step):
    """Fill in tools/components the notes skipped: rules first, then ENRICH."""
    e = ENRICH.get(n, {})
    tools = [OLD_TOOL_NAMES.get(t, t) for t in s.get("tools", [])]
    hw = {h["id"] for h in step.get("hardware", [])}
    if n in SHELL_ATTACH and "m5-csk" not in hw:
        step.setdefault("hardware", []).append(H("m5-csk", "16 mm"))
        hw.add("m5-csk")
    if any(not p.get("fit") and p.get("note") != "optional" for p in step.get("prints", [])):
        tools.append("printer")
    if step.get("cuts"):
        tools.append("laser")
    if hw & {"m5-csk", "m5-socket", "m5-low", "tnut", "3way", "corner", "m5-nut"}:
        tools.append("hexkeys")
    if hw & {"m5-insert", "m3-insert"}:
        tools.append("solder")
    if hw & {"m4-screw"}:
        tools.append("screwdrivers")
    if step["action"] == "wire":
        tools += ["cutters", "multimeter"]
    tools += e.get("tools", [])
    if "saw" in tools and "hacksaw" not in tools:
        tools.insert(tools.index("saw") + 1, "hacksaw")
    seen = []
    for t in tools:
        if t not in seen:
            seen.append(t)
    if seen:
        step["tools"] = seen
    comps = list(step.get("components", [])) + [c for c in e.get("components", []) if c not in step.get("components", [])]
    if comps:
        step["components"] = comps
    if e.get("tip"):
        step["tip"] = e["tip"] + (" " + step["tip"] if step.get("tip") else "")
    if e.get("tip2"):
        step["tip"] = (step["tip"] + " " if step.get("tip") else "") + e["tip2"]
    if e.get("warning2"):
        step["warning"] = (step["warning"] + " " if step.get("warning") else "") + e["warning2"]


def main():
    src = HERE / "guide.json"
    orig = HERE / "guide.user-original.json"
    if orig.exists() and src.exists() and "--force" not in sys.argv:
        if json.loads(src.read_text(encoding="utf-8")).get("version") == 2:
            sys.exit("guide.json was already generated (and may have builder edits since). "
                     "Edit it in the builder, or run  python make_guide.py --force  to rebuild it from this file.")
    if not orig.exists():
        shutil.copyfile(src, orig)
        print("saved your hand-written version as guide.user-original.json")
    timing = json.loads(orig.read_text(encoding="utf-8"))
    recorded = sorted(timing["steps"], key=lambda s: s["start"])
    assert len(recorded) == len(STEPS), f"{len(recorded)} recorded steps vs {len(STEPS)} written"
    meta = json.loads((HERE / "parts.json").read_text(encoding="utf-8")) if (HERE / "parts.json").exists() else {"printed": {}, "cuts": {}}
    titles = {c["id"]: c["title"] for c in CHAPTERS}

    steps = []
    for rec, s in zip(recorded, STEPS):
        step = {"id": rec["id"], "start": rec["start"], "end": rec["end"],
                "chapter": s["ch"], "phase": titles[s["ch"]], "action": s["action"], "title": s["title"], "text": s["text"]}
        for k in ("prints", "cuts", "hardware", "components", "images", "files", "tip", "warning"):
            if s.get(k):
                step[k] = [dict(x) if isinstance(x, dict) else x for x in s[k]] if isinstance(s[k], list) else s[k]
        enrich(len(steps) + 1, s, step)
        if step.get("files"):   # linked component models -> local downloads
            step["downloads"] = [{"name": f.rsplit(".", 1)[0], "files": downloads(f.rsplit(".", 1)[0])} for f in step.pop("files")]
        for p in step.get("prints", []):
            if p["part"] not in meta["printed"]:
                print("  ! no 3D model for", p["part"])
        steps.append(step)

    parts = {}
    for k, m in meta["printed"].items():
        parts[k] = {"name": k, "slug": m["slug"], "dims": m.get("dims"), "kind": "print", "files": downloads(k)}   # exact file name
    for k, m in meta["cuts"].items():
        parts[k] = {"name": k, "slug": m["slug"], "dims": m.get("dims"), "kind": "cut", "files": downloads(k)}

    guide = {
        "version": 2,
        "title": "Build CogniCare",
        "subtitle": "The complete assembly guide, from bare aluminium to a working robot.",
        "intro": "CogniCare is a desktop-sized humanoid robot: a pan-and-tilt head with two display eyes, speakers and a visor, a 16-inch touchscreen, and a full **ITX PC** inside a rotating base.\n\nThis guide follows the assembly animation step by step. Scroll and the video plays each step; every printed part has a 3D preview you can spin.",
        "notes": "- **Test every servo first** and give it its ID: **1** = hip, **4** = tilt, **5** = pan. Then put them in servo mode at position **500** so nothing moves unexpectedly.\n- Print every part in the **same brand** of PLA so the colour matches.\n- Drive screws at about **1 Nm** with the drill's clutch, then finish by hand so you don't crack printed parts.\n- Nearly every fastener is **M5**, going into drop-in T-nuts in the 2020 profiles. All outer panels (the base's acrylic boards and the nine body panels) fix with **M5 countersunk screws**.\n- Every printed part is **white Creality Hyper PLA**.\n- **Plan your cables early.** Everything from the upper body leaves through the umbilical cord port on the back and plugs into the I/O panel on the base. Leave slack so the hip can rotate without yanking cables.",
        "printMaterial": "White Creality Hyper PLA",
        "buildTime": "",
        "difficulty": "Advanced",
        "video": "assembly.mp4", "fps": timing.get("fps", 24), "duration": timing.get("duration", 589),
        "chapters": CHAPTERS,
        "cadBase": CAD_REPO,
        "hardware": HARDWARE,
        "tools": TOOLS,
        "kit": KIT,
        "parts": parts,
        "steps": steps,
        "updatedAt": int(time.time() * 1000),   # newer than any old builder draft in the browser
    }
    src.write_text(json.dumps(guide, indent=1, ensure_ascii=False), encoding="utf-8")
    n_print = len({p["part"] for s in steps for p in s.get("prints", [])})
    print(f"wrote guide.json: {len(steps)} steps, {len(CHAPTERS)} chapters, {n_print} printed parts referenced")


if __name__ == "__main__":
    main()
