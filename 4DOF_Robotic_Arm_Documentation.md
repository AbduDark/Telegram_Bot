# Mechatronics Engineering Project
## 4 Degree of Freedom Robotic Arm

**Dr: Tarek Abbas**

**Assistant Engineer: Mahmoud Gamal**

---

## Content

1. Introduction
2. Summary of References
3. Electrical Equations
4. Mechanical Equations
5. Sensors
6. Simulink MATLAB
7. Mechanical Operations
8. Conclusion
9. References

---

## 1. Introduction

The advancement of robotic technology has revolutionized modern manufacturing and automation processes. Robotic arms, particularly those with multiple degrees of freedom (DOF), have become essential tools in various industrial applications, including assembly lines, material handling, welding, painting, and pick-and-place operations.

A **4 Degree of Freedom (4-DOF) Robotic Arm** represents an optimal balance between complexity and functionality, providing sufficient flexibility for a wide range of tasks while maintaining relatively simple control algorithms and mechanical design. The four degrees of freedom typically consist of:

- **Base Rotation (θ₁)**: Rotation around the vertical axis
- **Shoulder Joint (θ₂)**: First arm segment rotation
- **Elbow Joint (θ₃)**: Second arm segment rotation
- **Wrist Joint (θ₄)**: End-effector orientation

This project focuses on the design, mathematical modeling, and control of a 4-DOF robotic arm utilizing **DC motors** as the primary actuators for high-torque joints and **Servo motors** for precise angular positioning. The combination of these two motor types provides an efficient and cost-effective solution for achieving both power and precision in robotic manipulation tasks.

The integration of DC motors and servo motors allows the robotic arm to:
- Handle significant payloads at the base and shoulder joints
- Achieve precise positioning at the elbow and wrist joints
- Maintain smooth and controlled motion trajectories
- Operate efficiently under varying load conditions

---

## 2. Summary of References

### A. Kinematics Modeling of a 4-DOF Robotic Arm

**1. Objective and Main Idea:** This reference presents the kinematic analysis of a 4-DOF robotic arm, focusing on forward and inverse kinematics using the Denavit-Hartenberg (D-H) convention.

**2. Components and Methodology:**
- **Key Components:** The system consists of four revolute joints connected by rigid links, with each joint providing one degree of freedom.
- **Process:** The D-H parameters are established for each joint, and transformation matrices are derived to calculate the end-effector position and orientation.

**3. Key Results:**
- Forward kinematics equations successfully predict end-effector position
- Inverse kinematics solutions enable path planning and trajectory control
- Workspace analysis determines the reachable volume of the manipulator

### B. Mathematical Modeling and Control of DC Motor

**1. Fundamental Mathematical Model:**
The model relates the applied armature voltage (Va) to the motor's angular velocity (ωa), essential for simulation and control system design.

**A. Electrical Characteristics:**
Applying Kirchhoff's Voltage Law:

$$V_a - i_a R_a - L_a \frac{di_a}{dt} - K_v \omega_a = 0$$

Where:
- Va = Applied Voltage (V)
- ia = Armature Current (A)
- Ra = Armature Resistance (Ω)
- La = Armature Inductance (H)
- Kv = Back EMF Constant (V·s/rad)

**B. Mechanical Characteristics:**
Torque balance equation:

$$K_t i_a - J \frac{d\omega_a}{dt} - B\omega_a - T_L = 0$$

Where:
- Kt = Torque Constant (N·m/A)
- J = Moment of Inertia (kg·m²)
- B = Viscous Damping Coefficient (N·m·s/rad)
- TL = Load Torque (N·m)

### C. DC Servo Motor Modeling for Robotic Applications

**1. Complete Motor Transfer Function:**

The transfer function from voltage to angular displacement:

$$G_m(s) = \frac{\theta_m(s)}{V_a(s)} = \frac{K_t}{L_a J_e S^3 + (R_a J_e + L_a D_e)S^2 + (R_a D_e + K_t K_b)S}$$

**2. Simplified Transfer Function (neglecting La):**

$$G_m(s) = \frac{\theta_m(s)}{V_a(s)} = \frac{K_t/R_a}{s(Js + B + K_t K_b/R_a)}$$

### D. Robot Dynamics and Control

**1. Lagrangian Formulation:**
For a complete robotic arm, the dynamics are derived using Lagrange's equation:

$$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}_i}\right) - \frac{\partial L}{\partial q_i} = \tau_i$$

Where:
- L = T - V (Lagrangian = Kinetic Energy - Potential Energy)
- qi = Joint angle for joint i
- τi = Applied torque at joint i

**2. Robot Dynamics Equation:**

$$M(q)\ddot{q} + C(q,\dot{q})\dot{q} + G(q) = \tau$$

Where:
- M(q) = Mass/Inertia Matrix (4×4)
- C(q,q̇) = Coriolis and Centrifugal Matrix (4×4)
- G(q) = Gravity Vector (4×1)
- τ = Joint Torque Vector (4×1)

---

## 3. Electrical Equations

### 3.1 DC Motor Electrical Model

The DC motor forms the primary actuation system for the base rotation and shoulder joint due to its high torque capability.

**Armature Circuit Equation:**

$$V_a(t) = R_a i_a(t) + L_a \frac{di_a(t)}{dt} + V_b(t)$$

**Back EMF Equation:**

$$V_b(t) = K_b \frac{d\theta}{dt} = K_b \omega(t)$$

Where:
- Va(t) = Applied armature voltage (V)
- Ra = Armature resistance (Ω)
- La = Armature inductance (H)
- ia(t) = Armature current (A)
- Vb(t) = Back-EMF voltage (V)
- Kb = Back-EMF constant (V·s/rad)
- ω(t) = Angular velocity (rad/s)

**Motor Torque Equation:**

$$T_m(t) = K_t \cdot i_a(t)$$

Where:
- Tm = Motor torque (N·m)
- Kt = Torque constant (N·m/A)

### 3.2 Servo Motor Electrical Model

Servo motors are used for the elbow and wrist joints due to their precise position control capabilities.

**PWM Control Signal:**
The servo motor receives a Pulse Width Modulation (PWM) signal:

$$\theta_{servo} = \frac{(PWM_{width} - PWM_{min})}{(PWM_{max} - PWM_{min})} \times \theta_{range}$$

Where:
- θservo = Desired angular position
- PWMwidth = Current pulse width (μs)
- PWMmin = Minimum pulse width (typically 500-1000 μs)
- PWMmax = Maximum pulse width (typically 2000-2500 μs)
- θrange = Total angular range (typically 0° to 180°)

### 3.3 State-Space Representation

For each DC motor joint, the state-space model is:

**State Variables:**
- x₁ = ia(t) (armature current)
- x₂ = θ(t) (angular position)
- x₃ = dθ/dt = ω(t) (angular velocity)

**State Equations:**

$$\frac{dx_1}{dt} = \frac{1}{L_a}[V_a - R_a x_1 - K_b x_3]$$

$$\frac{dx_2}{dt} = x_3$$

$$\frac{dx_3}{dt} = \frac{1}{J}[K_t x_1 - B x_3]$$

**Matrix Form:**

$$\dot{x} = Ax + Bu$$
$$y = Cx + Du$$

Where:

$$A = \begin{bmatrix} -R_a/L_a & 0 & -K_b/L_a \\ 0 & 0 & 1 \\ K_t/J & 0 & -B/J \end{bmatrix}$$

$$B = \begin{bmatrix} 1/L_a \\ 0 \\ 0 \end{bmatrix}$$

$$C = \begin{bmatrix} 0 & 1 & 0 \end{bmatrix}$$

---

## 4. Mechanical Equations

### 4.1 Denavit-Hartenberg Parameters

The 4-DOF robotic arm kinematics are described using D-H parameters:

| Link i | θᵢ | dᵢ | aᵢ | αᵢ |
|--------|----|----|----|----|
| 1 | θ₁ | d₁ | 0 | 90° |
| 2 | θ₂ | 0 | a₂ | 0° |
| 3 | θ₃ | 0 | a₃ | 0° |
| 4 | θ₄ | 0 | a₄ | 0° |

Where:
- d₁ = Height of base joint
- a₂ = Length of upper arm
- a₃ = Length of forearm
- a₄ = Length of end-effector

### 4.2 Homogeneous Transformation Matrix

For each link, the transformation matrix is:

$$T_i = \begin{bmatrix} \cos\theta_i & -\sin\theta_i \cos\alpha_i & \sin\theta_i \sin\alpha_i & a_i \cos\theta_i \\ \sin\theta_i & \cos\theta_i \cos\alpha_i & -\cos\theta_i \sin\alpha_i & a_i \sin\theta_i \\ 0 & \sin\alpha_i & \cos\alpha_i & d_i \\ 0 & 0 & 0 & 1 \end{bmatrix}$$

**End-Effector Position:**

$$T_{0}^{4} = T_1 \cdot T_2 \cdot T_3 \cdot T_4$$

### 4.3 Forward Kinematics

The position of the end-effector (px, py, pz):

$$p_x = \cos\theta_1 [a_2 \cos\theta_2 + a_3 \cos(\theta_2 + \theta_3) + a_4 \cos(\theta_2 + \theta_3 + \theta_4)]$$

$$p_y = \sin\theta_1 [a_2 \cos\theta_2 + a_3 \cos(\theta_2 + \theta_3) + a_4 \cos(\theta_2 + \theta_3 + \theta_4)]$$

$$p_z = d_1 + a_2 \sin\theta_2 + a_3 \sin(\theta_2 + \theta_3) + a_4 \sin(\theta_2 + \theta_3 + \theta_4)$$

### 4.4 Inverse Kinematics

Given desired end-effector position (x, y, z):

**Base Angle:**
$$\theta_1 = \arctan2(y, x)$$

**Arm Plane Coordinates:**
$$r = \sqrt{x^2 + y^2}$$
$$s = z - d_1$$

**Elbow Angle (using geometric approach):**
$$D = \frac{r^2 + s^2 - a_2^2 - a_3^2}{2 a_2 a_3}$$
$$\theta_3 = \arctan2(\pm\sqrt{1-D^2}, D)$$

**Shoulder Angle:**
$$\theta_2 = \arctan2(s, r) - \arctan2(a_3 \sin\theta_3, a_2 + a_3 \cos\theta_3)$$

**Wrist Angle:**
$$\theta_4 = \phi - \theta_2 - \theta_3$$

Where φ is the desired orientation of the end-effector.

### 4.5 Dynamic Equations

**Equation of Motion for Each Joint:**

For DC motor driven joints (Joint 1 and 2):

$$J_i \ddot{\theta}_i + B_i \dot{\theta}_i = K_{t,i} i_{a,i} - \tau_{load,i}$$

For servo motor driven joints (Joint 3 and 4):

$$J_i \ddot{\theta}_i + B_i \dot{\theta}_i + K_i (\theta_i - \theta_{ref,i}) = 0$$

**Complete Robot Dynamics:**

$$M(q)\ddot{q} + C(q,\dot{q})\dot{q} + G(q) = \tau$$

Where q = [θ₁, θ₂, θ₃, θ₄]ᵀ

### 4.6 Jacobian Matrix

The Jacobian relates joint velocities to end-effector velocities:

$$\dot{X} = J(q) \dot{q}$$

Where:

$$J = \begin{bmatrix} \frac{\partial p_x}{\partial \theta_1} & \frac{\partial p_x}{\partial \theta_2} & \frac{\partial p_x}{\partial \theta_3} & \frac{\partial p_x}{\partial \theta_4} \\ \frac{\partial p_y}{\partial \theta_1} & \frac{\partial p_y}{\partial \theta_2} & \frac{\partial p_y}{\partial \theta_3} & \frac{\partial p_y}{\partial \theta_4} \\ \frac{\partial p_z}{\partial \theta_1} & \frac{\partial p_z}{\partial \theta_2} & \frac{\partial p_z}{\partial \theta_3} & \frac{\partial p_z}{\partial \theta_4} \end{bmatrix}$$

---

## 5. Sensors

### 5.1 Position Sensors

**Rotary Encoders (for DC Motor Joints):**
- Type: Incremental or Absolute Encoders
- Resolution: 360-1000 PPR (Pulses Per Revolution)
- Purpose: Measure angular position and velocity of DC motor shafts
- Interface: Quadrature output (A, B channels) for direction detection

**Potentiometers (Internal to Servo Motors):**
- Type: Built-in feedback potentiometer
- Range: 0° to 180° (or 0° to 270° for extended range servos)
- Purpose: Internal closed-loop position control

### 5.2 Current Sensors

**Hall Effect Current Sensors:**
- Type: ACS712 or similar
- Range: ±5A to ±30A depending on motor requirements
- Purpose: Monitor armature current for torque estimation and overcurrent protection
- Output: Analog voltage proportional to current

### 5.3 Limit Switches

**Mechanical Limit Switches:**
- Type: Micro switches or magnetic reed switches
- Purpose: Detect joint limits and home positions
- Location: Installed at maximum and minimum angular positions

### 5.4 Force/Torque Sensors (Optional)

**Strain Gauge Based Sensors:**
- Purpose: Measure grip force at end-effector
- Application: Delicate object handling and force control

### 5.5 Sensor Integration Table

| Sensor Type | Joint Location | Purpose | Output |
|-------------|----------------|---------|--------|
| Encoder | Joint 1, 2 | Position/Velocity | Digital Pulses |
| Potentiometer | Joint 3, 4 | Position (internal) | Analog |
| Current Sensor | Motor 1, 2 | Torque Estimation | Analog |
| Limit Switch | All Joints | Safety/Homing | Digital |

---

## 6. Simulink MATLAB

### 6.1 DC Motor Subsystem Model

The DC motor is modeled in Simulink using the following blocks:

**Transfer Function Block (Simplified Model):**

$$G_{motor}(s) = \frac{\theta(s)}{V_a(s)} = \frac{K_t}{s[(L_a s + R_a)(Js + B) + K_t K_b]}$$

**Typical Parameter Values:**
- Ra = 2.0 Ω (Armature Resistance)
- La = 0.5 mH (Armature Inductance)
- Kt = 0.1 N·m/A (Torque Constant)
- Kb = 0.1 V·s/rad (Back EMF Constant)
- J = 0.01 kg·m² (Rotor Inertia)
- B = 0.001 N·m·s/rad (Viscous Friction)

### 6.2 PID Controller Design

**PID Control Law:**

$$V_a(t) = K_p e(t) + K_i \int_0^t e(\tau) d\tau + K_d \frac{de(t)}{dt}$$

Where:
- e(t) = θdesired - θactual (position error)
- Kp = Proportional gain
- Ki = Integral gain
- Kd = Derivative gain

**Recommended Initial PID Values:**
- Kp = 50-100
- Ki = 10-50
- Kd = 1-10

### 6.3 Servo Motor Subsystem Model

**Second-Order Approximation:**

$$G_{servo}(s) = \frac{\theta(s)}{\theta_{ref}(s)} = \frac{\omega_n^2}{s^2 + 2\zeta\omega_n s + \omega_n^2}$$

Where:
- ωn = Natural frequency (typically 10-50 rad/s)
- ζ = Damping ratio (typically 0.7-1.0)

### 6.4 Complete System Simulation

**Simulation Parameters:**
- Solver: ode45 (Dormand-Prince)
- Step Size: Variable (max 0.001 s)
- Simulation Time: 10-30 seconds

**Input Signals:**
- Step inputs for position control testing
- Sinusoidal inputs for trajectory tracking
- Trapezoidal velocity profiles for smooth motion

### 6.5 Simulink Block Diagram Components

1. **Reference Input Block**: Desired joint angles
2. **Error Calculator**: Summing junction
3. **PID Controller**: Control signal generation
4. **Motor Model**: DC motor transfer function
5. **Encoder Model**: Position feedback with quantization
6. **Scope**: Display position, velocity, current, and error signals

---

## 7. Mechanical Operations

### 7.1 Structural Design

**Base Structure:**
- Material: Aluminum alloy or Steel
- Design: Circular or square base plate
- Mounting: Bolted to work surface
- Motor: High-torque DC motor with planetary gearbox

**Upper Arm (Link 2):**
- Material: Aluminum extrusion or sheet metal
- Length: a₂ = 150-250 mm (adjustable based on application)
- Motor: DC motor with encoder at shoulder joint

**Forearm (Link 3):**
- Material: Lightweight aluminum or carbon fiber
- Length: a₃ = 150-200 mm
- Motor: Servo motor at elbow joint

**End-Effector Mount (Link 4):**
- Material: 3D printed or machined aluminum
- Length: a₄ = 50-100 mm
- Motor: Servo motor for wrist rotation

### 7.2 Motor Selection Criteria

**DC Motor Selection (Joints 1, 2):**

$$T_{required} = T_{static} + T_{dynamic}$$

$$T_{static} = \sum_{i} m_i g d_i$$

$$T_{dynamic} = J_{total} \alpha_{max}$$

Where:
- mi = Mass of link i and payload
- di = Distance from joint to center of mass
- αmax = Maximum angular acceleration

**Servo Motor Selection (Joints 3, 4):**
- Torque Rating: 10-25 kg·cm (based on load)
- Speed: 0.15-0.20 s/60° at no load
- Voltage: 4.8V - 7.4V
- Recommended: MG996R or DS3218 digital servo

### 7.3 Gear Reduction

**Planetary Gearbox for DC Motors:**
- Gear Ratio: 1:10 to 1:50
- Efficiency: 85-95%
- Purpose: Increase torque, reduce speed

**Output Torque:**
$$T_{output} = T_{motor} \times n \times \eta$$

Where:
- n = Gear ratio
- η = Gearbox efficiency

### 7.4 Workspace Analysis

**Reachable Workspace:**
- Maximum reach: Rmax = a₂ + a₃ + a₄
- Minimum reach: Rmin = |a₂ - a₃ - a₄|
- Vertical range: d₁ ± (a₂ + a₃ + a₄)

**Workspace Volume (approximate):**
$$V_{workspace} = \frac{4}{3}\pi (R_{max}^3 - R_{min}^3) \times \frac{\theta_{1,max}}{360°}$$

### 7.5 Assembly Sequence

1. Assemble base structure and mount DC motor
2. Install planetary gearbox on base motor
3. Attach upper arm to shoulder joint
4. Mount shoulder DC motor with encoder
5. Connect forearm to elbow joint
6. Install elbow servo motor
7. Attach end-effector mount
8. Install wrist servo motor
9. Wire all motors to controller
10. Calibrate home positions using limit switches

---

## 8. Conclusion

This project presents the comprehensive design and analysis of a **4 Degree of Freedom Robotic Arm** combining DC motors and servo motors for optimal performance. The key achievements include:

### 8.1 Technical Achievements

1. **Complete Mathematical Model**: Developed electrical and mechanical equations for both DC motors and servo motors, enabling accurate simulation and control design.

2. **Kinematics Analysis**: Derived forward and inverse kinematics using the Denavit-Hartenberg convention, allowing precise end-effector positioning.

3. **Dynamic Modeling**: Established the robot dynamics equation incorporating the mass matrix, Coriolis effects, and gravity compensation.

4. **Control System Design**: Implemented PID controllers with appropriate tuning for stable and responsive joint control.

5. **Sensor Integration**: Selected and integrated appropriate sensors for position feedback, current monitoring, and safety limits.

### 8.2 Advantages of the Hybrid Motor Approach

- **DC Motors** at base and shoulder joints provide:
  - High continuous torque for heavy lifting
  - Smooth velocity control
  - Efficient operation under varying loads

- **Servo Motors** at elbow and wrist joints provide:
  - Precise angular positioning
  - Built-in feedback control
  - Compact size and easy integration
  - Cost-effective solution for lower-torque joints

### 8.3 Applications

The 4-DOF robotic arm is suitable for:
- Pick and place operations
- Assembly line automation
- Educational and research purposes
- Light manufacturing tasks
- Material handling
- Sorting and packaging

### 8.4 Future Work

- Implementation of trajectory planning algorithms
- Integration of vision system for object detection
- Development of mobile application for remote control
- Addition of gripper force feedback
- Machine learning for adaptive control

---

## 9. References

1. **Kinematics Modeling of a 4-DOF Robotic Arm**, International Journal of Robotics and Automation, Academia.edu, 2015.

2. **Mathematical Modeling and Control of DC Motor**, Control Systems Engineering References, GMU, 2020.

3. **MODELING DC SERVOMOTORS CONTROL SYSTEMS TECH NOTE**, Dr. Russ Meier, Milwaukee School of Engineering (MSOE), 2018.

4. **DC Motors: Dynamic Model and Control Techniques**, ResearchGate Publications, 2019.

5. **System Identification for a Mathematical Model of DC Motor System**, IEEE Conference Proceedings, 2021.

6. **Robot Modeling and Control**, Mark W. Spong, Seth Hutchinson, and M. Vidyasagar, John Wiley & Sons, 2006.

7. **Introduction to Robotics: Mechanics and Control**, John J. Craig, Pearson Education, 4th Edition, 2017.

8. **Fundamentals of Robotic Mechanical Systems**, Jorge Angeles, Springer, 4th Edition, 2014.

9. **Modern Control Engineering**, Katsuhiko Ogata, Pearson Education, 5th Edition, 2010.

10. **Arduino-Based Servo Motor Control for Robotic Applications**, Instructables Engineering Projects, 2023.

11. **Build a 4-DOF Robotic Arm**, Circuit Cellar Research Design Hub, 2022.

12. **Kinematical Investigation and Regulation of a 4-DOF Model**, Acta Mechanica Slovaca, Vol. 20, No. 3, 2016.

---

## Appendix A: Motor Specifications

### DC Motor (Base and Shoulder Joints)
| Parameter | Symbol | Value | Unit |
|-----------|--------|-------|------|
| Rated Voltage | Vn | 12-24 | V |
| No-Load Speed | ω₀ | 3000-6000 | RPM |
| Stall Torque | Ts | 0.5-2.0 | N·m |
| Armature Resistance | Ra | 1-5 | Ω |
| Armature Inductance | La | 0.1-1.0 | mH |
| Torque Constant | Kt | 0.05-0.2 | N·m/A |
| Back EMF Constant | Kb | 0.05-0.2 | V·s/rad |
| Rotor Inertia | Jm | 10-100 | g·cm² |

### Servo Motor (Elbow and Wrist Joints)
| Parameter | Value | Unit |
|-----------|-------|------|
| Operating Voltage | 4.8-7.4 | V |
| Stall Torque (6V) | 10-25 | kg·cm |
| Operating Speed (6V) | 0.15-0.20 | s/60° |
| Rotation Range | 0-180 | degrees |
| PWM Frequency | 50 | Hz |
| Pulse Width Range | 500-2500 | μs |

---

## Appendix B: Simulink Model Parameters

```matlab
% DC Motor Parameters
Ra = 2.0;       % Armature resistance (Ohm)
La = 0.5e-3;    % Armature inductance (H)
Kt = 0.1;       % Torque constant (N.m/A)
Kb = 0.1;       % Back EMF constant (V.s/rad)
Jm = 0.01;      % Motor inertia (kg.m^2)
Bm = 0.001;     % Viscous friction (N.m.s/rad)

% Gear Ratio
n = 20;         % Gear reduction ratio

% PID Controller Gains
Kp = 80;        % Proportional gain
Ki = 20;        % Integral gain
Kd = 5;         % Derivative gain

% Robot Link Lengths
d1 = 0.10;      % Base height (m)
a2 = 0.20;      % Upper arm length (m)
a3 = 0.15;      % Forearm length (m)
a4 = 0.08;      % End-effector length (m)

% Servo Motor Parameters
wn = 30;        % Natural frequency (rad/s)
zeta = 0.8;     % Damping ratio
```

---

**End of Document**
