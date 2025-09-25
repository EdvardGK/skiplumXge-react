

# **A Technical Blueprint for a Norwegian Building Energy Performance Calculator: Methodology, Inputs, and Actionable KPIs based on NS 3031:2014**

## **Section 1: The NS 3031:2014 Calculation Framework: A Foundational Overview**

The Norwegian Standard NS 3031:2014, "Calculation of energy performance of buildings – Method and data," provides the official methodology for assessing and documenting the energy efficiency of buildings in Norway.1 Despite being formally withdrawn in 2018 due to harmonization with European standards, it remains the legally referenced standard in the current Norwegian Building Regulations (TEK17).3 Consequently, any tool designed for compliance checking, such as a replacement for the decommissioned TEK-sjekk, must be fundamentally based on its principles. This section outlines the core theoretical and mathematical framework of the standard, which forms the foundation of the calculation engine.

### **1.1. The Principle of Net Energy Need (Netto energibehov)**

The primary output of an NS 3031 calculation is the building's **net energy need** (netto energibehov). This metric is defined as the theoretical amount of energy required by the building to maintain standard indoor comfort conditions, calculated without considering the efficiency of the specific heating, cooling, or energy distribution systems installed.6 It is expressed in kilowatt-hours per square meter of heated floor area per year (kWh/m² per year).1

This standardized value is not intended to predict a building's actual, measured energy consumption, which is influenced by occupant behavior, local microclimates, and system performance. Instead, its purpose is to provide a uniform basis for comparing the inherent thermal quality of different buildings and for verifying compliance with the national energy frames (energirammer) stipulated in TEK17.6 For example, TEK17 specifies that a new small house (

småhus) must have a net energy need no greater than 100+1600/ABRA​, where ABRA​ is the heated floor area.6

The calculation of net energy need is governed by a fundamental energy balance equation that applies over a defined period, typically a month or a year:

Enet​=Qloss​−ηgain​⋅Qgain​  
Where:

* Enet​ is the net energy need for heating.  
* Qloss​ represents the total heat loss from the building.  
* Qgain​ represents the total free heat gains from internal sources and solar radiation.  
* ηgain​ is the utilization factor for heat gains, which accounts for the fact that not all free heat is useful (e.g., solar gains in an already warm room do not reduce heating demand).

This balance between heat loss and utilized heat gains is the central concept that underpins the entire calculation methodology.9

### **1.2. Deconstructing Heat Loss: The Core Equations**

Total heat loss (Qloss​) is the sum of energy escaping the building's thermal envelope through conduction, convection, and air exchange. NS 3031 provides specific methods for quantifying each of these loss pathways.

#### **1.2.1. Transmission Losses (QT​)**

Transmission loss is the heat conducted through the building's envelope—its walls, roof, floors, windows, and doors. The calculation methodology separates this into two components: heat loss through the main surfaces of building elements and additional heat loss through linear thermal bridges (junctions and corners where insulation is often compromised).11

The total heat transfer coefficient for transmission (HT​), measured in W/K, is calculated using the following formula:

HT​=i∑​(Ui​⋅Ai​)+k∑​(Ψk​⋅lk​)  
Where:

* Ui​ is the thermal transmittance, or U-value, of a specific building component i (e.g., a wall section), expressed in W/(m²K). A lower U-value signifies better insulation.12  
* Ai​ is the area of that component in m².  
* Ψk​ is the linear thermal transmittance of a thermal bridge k (e.g., the junction between a wall and a window), expressed in W/(mK).  
* lk​ is the length of that thermal bridge in m.

A crucial parameter derived from this is the "Normalised thermal bridge value" (normalisert kuldebroverdi), which is the total thermal bridge loss divided by the building's heated floor area (Ψtotal​=∑(Ψk​⋅lk​)/ABRA​).14 TEK17 sets specific maximum limits for this value (e.g.,

≤0.05 W/m²K for small houses), making it a key compliance metric.6

The structure of the heat loss calculation reveals a critical interplay between building components. The total thermal performance of the envelope is a sum of its parts, and a weakness in one area can undermine strengths in another. For instance, a building with exceptionally well-insulated walls (a very low U-value) can still exhibit poor overall energy performance if it has significant thermal bridging at corners and junctions (high Ψ-values) or uses low-performance windows. Recognizing this, TEK17 allows for a degree of flexibility through "omfordeling" (redistribution). A designer can choose to use a component that is slightly worse than the prescriptive standard (e.g., a window with a U-value of 0.90 W/m²K instead of the standard 0.80 W/m²K) provided they compensate by improving another component (e.g., using better wall insulation) to ensure the building's total "heat loss figure" (varmetapstall) does not increase.6 This forces a holistic design approach and creates an opportunity for cost-optimization, where investments can be directed toward the most effective measures. An advanced energy calculation tool should not merely report static values but empower users to explore these trade-offs, simulating different component combinations to find the most economically efficient path to compliance.

#### **1.2.2. Ventilation and Infiltration Losses (QV​+QI​)**

Heat loss also occurs as warm indoor air is replaced by colder outdoor air. This happens through two mechanisms: controlled ventilation (mechanical or natural systems designed for air quality) and uncontrolled infiltration (air leakage through cracks and gaps in the building envelope).

The heat transfer coefficient for ventilation (HV​) is calculated as:

HV​=V˙⋅(ρcp​)⋅(1−ηv​)  
Where:

* V˙ is the average ventilation air rate in m³/s.  
* (ρcp​) is the volumetric heat capacity of air, for which NS 3031 uses a standard factor of approximately 0.33 Wh/m³K.11  
* ηv​ is the annual average temperature efficiency of the heat recovery unit in a balanced ventilation system. TEK17 requires this to be at least 80% for new residential buildings.6 If there is no heat recovery,  
  ηv​=0.

Infiltration loss (HI​) is calculated using a similar formula, but the air rate is derived from the building's airtightness. The key input here is the air leakage rate at 50 Pa pressure difference (n50​), measured in air changes per hour (ac/h). TEK17 sets a stringent requirement for new residential buildings of n50​≤0.6 ac/h.6 This measured value is then converted into an average natural infiltration rate for the calculation.

### **1.3. Quantifying Heat Gains: Balancing the Equation**

To offset the heat losses, the NS 3031 calculation accounts for "free" heat gains from internal sources (people, lights, appliances) and from the sun.

#### **1.3.1. Standardized Internal Heat Gains (Qint​)**

To ensure that calculations are standardized and comparable across all projects, NS 3031 mandates the use of fixed, normative values for internal heat gains, irrespective of the actual occupants' lifestyle or equipment usage.6 These standardized inputs are detailed in the appendices of the standard, primarily Appendix A.

The tables in Appendix A provide values for different building categories, such as small houses, apartment blocks, and various types of commercial buildings.19 These tables specify:

* Annual energy use for lighting and equipment in kWh/m² per year.  
* The resulting average internal heat gain from people, lighting, and equipment, expressed in W/m².  
* Standardized operating schedules (driftstider) that define when these gains occur.21

For example, a standard office building might have a normative lighting energy demand of 25 kWh/m² per year, which is then used to calculate the corresponding heat gain during operating hours.22

#### **1.3.2. Solar Gains (Qsol​)**

Solar gain is the energy from solar radiation that enters the building through its windows and contributes to heating the interior. The calculation is a complex function of several variables: window area, orientation (north, south, east, west), tilt angle, glazing properties, and the effect of shading from building elements or external objects.23

The key glazing properties are the U-value (which governs heat loss) and the Solar Heat Gain Coefficient (SHGC), a value between 0 and 1 that indicates the fraction of incident solar radiation that enters as heat.23 For compliance calculations, NS 3031 uses standardized monthly climate data for a reference location (typically Oslo) to determine the amount of solar radiation incident on each facade.7

A simplified representation of the monthly solar gain calculation is:

Qsol,month​=orient∑​(Awin​⋅SHGC⋅Isol,month​⋅Fshading​)  
Where:

* Awin​ is the window area for a given orientation.  
* SHGC is the Solar Heat Gain Coefficient for the glazing.  
* Isol,month​ is the total monthly solar radiation on that surface from the standard climate file.  
* Fshading​ is a reduction factor accounting for permanent shading.

The treatment of solar gain highlights a fundamental tension in energy-efficient building design. In a cold climate like Norway's, passive solar gain is highly beneficial during the heating season, as it directly reduces the amount of energy that must be purchased for heating.28 However, this same gain can become a significant liability during warmer months, leading to overheating and potentially creating a need for active cooling, which is a separate energy post in the NS 3031 calculation.29 This makes the specification of windows—particularly their SHGC—a critical balancing act. A high-SHGC window that is advantageous in winter can be detrimental in summer, especially on east- and west-facing facades which receive intense, low-angle sun.25 A truly insightful energy analysis tool must therefore present this duality to the user. Instead of showing a single annual "solar gain" figure, it should visualize the monthly contributions, clearly distinguishing between beneficial winter gains that reduce heating demand and potentially problematic summer gains that drive up cooling demand. This provides a far more nuanced and actionable basis for decisions regarding window selection, orientation, and the need for external shading solutions.32

## **Section 2: User Inputs and Standardized Data: Structuring the Two-Step Form**

To create a tool that is both accessible to casual users and robust for professionals, a two-tiered input structure is required. The "Basic" form prioritizes simplicity and speed, making intelligent assumptions based on minimal data. The "Advanced" form provides granular control, allowing experts to input detailed, project-specific data for a more precise calculation. The foundation for both is the set of standardized data (normerte inndata) provided in the appendices of NS 3031:2014.

### **2.1. The "Basic" Form: A Simplified Estimation Model**

The primary objective of the Basic form is to deliver a meaningful energy performance estimate with the lowest possible barrier to entry. It is designed for homeowners, real estate agents, or developers in the very early stages of a project who need a quick assessment without access to detailed technical specifications.

The methodology for this form is to use a few key user inputs to select a pre-defined building archetype. The backend calculation engine then populates the full suite of required parameters using default values derived from the building's age and type, based on the requirements in TEK17 and typical construction practices.

**Required User Inputs for the Basic Form:**

* **Building Type (Bygningskategori):** A simple dropdown menu is essential. The user selects from a list such as "Småhus" (single-family, row house, etc.), "Boligblokk" (apartment block), or other relevant categories from TEK17.6 This selection is the most critical input, as it determines which set of standardized values for internal loads, occupancy, and operating hours from NS 3031 Appendix A will be applied.19  
* **Heated Floor Area (Oppvarmet BRA):** A numeric input field for the building's heated gross internal area in square meters (m²). This is the fundamental unit for normalization, as nearly all results are expressed in kWh/m².1  
* **Construction Year (Byggeår):** A numeric input for the year the building was completed. This allows the system to automatically infer the building code applicable at the time of construction (e.g., pre-TEK97, TEK10, TEK17) and apply a corresponding set of default U-values for walls, roof, windows, and a typical air leakage rate for that era.33  
* **Location (Kommune/Postal Code):** A dropdown menu or text field for the building's municipality or postal code. While strict TEK17 compliance calculations for energy labeling use a standardized Oslo climate, providing a location allows the tool to offer a more realistic estimate of actual energy use by applying local climate data.7  
* **Primary Heating System:** A simplified dropdown list (e.g., "Electric Radiators," "Air-to-Air Heat Pump," "Hydronic Floor Heating," "District Heating"). This input does not affect the *net energy need* calculation but is vital for the subsequent step of estimating the *delivered energy* (the energy that must be purchased), energy costs, and the final energy grade (A-G).

### **2.2. The "Advanced" Form: A Detailed Component-Based Model**

The Advanced form is designed for technical users—architects, engineers, energy advisors—who require a precise and verifiable calculation for project design, optimization, and official documentation. This form exposes the key physical parameters of the building, allowing the user to override all the assumptions made in the Basic form with project-specific data.

**Required User Inputs for the Advanced Form:**

This form includes all fields from the Basic form but allows for detailed overrides and additional inputs:

* **Building Envelope (Klimaskjerm):**  
  * **Opaque Elements:** A section where the user can define multiple types of external walls, roofs, and floors. For each type, they must input the total **Area (m²)** and the calculated **U-value (W/m²K)**.6  
  * **Windows and Doors:** A detailed table or section where the user can input specifications for windows and glazed doors grouped by orientation (North, South, East, West). For each orientation, the required inputs are **Area (m²)**, average **U-value (W/m²K)**, and average **Solar Heat Gain Coefficient (SHGC)**.6  
  * **Thermal Bridges (Kuldebroer):** The user should have two options: 1\) Input a single, pre-calculated **Normalised thermal bridge value (W/m²K)** for the entire building, or 2\) A detailed mode to input the **Length (m)** and **Ψ-value (W/mK)** for each major type of junction (e.g., wall-floor, window-wall).11  
* **Airtightness (Lufttetthet):**  
  * A numeric input for the measured or target **air leakage rate at 50 Pa pressure difference (n50​)**, in air changes per hour (ac/h).6  
* **Ventilation System (Ventilasjonsanlegg):**  
  * **System Type:** Dropdown menu (e.g., "Balanced with heat recovery," "Mechanical exhaust," "Natural").  
  * **Specific Fan Power (SFP):** Numeric input in kW/(m³/s). This measures the fan efficiency.6  
  * **Heat Recovery Efficiency (ηv​):** Numeric input for the annual average temperature efficiency of the heat exchanger, in percent (%).6  
  * **Airflow Rates:** Numeric inputs for the average ventilation airflow during operating hours and outside of operating hours, typically in m³/h per m² of floor area.17  
* **Internal Loads and Schedules (Overrides):**  
  * For advanced analysis (e.g., estimating actual consumption), the form should allow users to override the standardized values for lighting power, equipment loads, and operating hours. However, a clear disclaimer must state that for official TEK17 compliance calculations, the standardized values from NS 3031 must be used.6

### **2.3. The Role of Standardized Data: A Deep Dive into NS 3031:2014 Appendices**

The consistency and comparability of energy calculations in Norway hinge on the use of standardized input data, or normerte inndata, as specified in the normative appendices of NS 3031:2014.6 These appendices provide fixed values for variables that are dependent on user behavior and location, thereby isolating the building's physical characteristics for evaluation.

* **Appendix A (Tillegg A): Standardized Usage Data.** This appendix is the source for all internal load and scheduling parameters.39 Its key tables include:  
  * **Table A.1:** Specifies the annual energy need (kWh/m² per year) and the corresponding average power during operation (W/m²) for **lighting, technical equipment, and domestic hot water (DHW)**. These values are provided for each of the 13 official building categories.19  
  * **Table A.2:** Defines the average **internal heat gain (W/m²)** to be used in the thermal balance calculation. It specifies the heat emitted by **persons, lighting, and equipment** during operating hours for each building category.19  
  * **Table A.3:** Outlines the standardized **operating hours (driftstider)** for different functions within the building (e.g., heating systems, ventilation, occupancy) in hours per day and days per week.19  
  * **Table A.4:** Provides indicative values for normalized thermal bridge values for different construction types, which can be used when detailed calculations are not available.19  
* **Appendix M (Tillegg M): Standardized Climate Data.** This appendix contains the official reference climate data—monthly average outdoor temperatures and monthly total solar radiation for various surface orientations—for Oslo. This data set must be used for all calculations intended to demonstrate compliance with TEK17 energy frames or for generating an official Energy Performance Certificate (EPC).6

The mandated use of this standardized data creates a critical distinction in the purpose and application of the calculation results. When the tool uses the normative inputs from Appendices A and M, it operates in a **"Compliance Mode."** The output is not a forecast of the building's utility bill but a standardized rating of its thermal performance, allowing for a fair comparison against the legal requirements and other buildings. This is the mode required for official documentation.

However, TEK17 also introduces the concept of an "energy budget" for non-residential buildings, which *must* be calculated using *real* values specific to the project, including local climate data, actual planned operating hours, and specific equipment loads.7 This defines a second, distinct use case: a

**"Real-World Mode."** In this mode, the calculation engine remains the same, but it is fed with user-specified or locally sourced data instead of the standardized values.

A successful tool must be architected to support this duality. The user interface should feature a clear toggle or separate workflows for "Official Energy Rating (TEK17 Compliance)" and "Estimated Actual Consumption." This single feature dramatically expands the product's value proposition, making it indispensable not only for designers and architects focused on compliance but also for building owners and facility managers focused on operational cost and energy optimization.

#### **Table 1: User Inputs for Basic vs. Advanced Forms**

| Parameter | Basic Form Input | Advanced Form Input |
| :---- | :---- | :---- |
| **General** |  |  |
| Building Type | User Selection (Dropdown) | User Selection (Dropdown) |
| Heated Floor Area (BRA) | User Input (Numeric) | User Input (Numeric) |
| Construction Year | User Input (Numeric) | User Input (Numeric) |
| Location/Municipality | User Selection (Dropdown) | User Selection (Dropdown) |
| **Building Envelope** |  |  |
| Wall U-value | Inferred from Construction Year | User Override (Numeric, per wall type) |
| Roof U-value | Inferred from Construction Year | User Override (Numeric, per roof type) |
| Floor U-value | Inferred from Construction Year | User Override (Numeric, per floor type) |
| Window U-value | Inferred from Construction Year | User Override (Numeric, per orientation) |
| Window SHGC | Standard Default (e.g., 0.6) | User Override (Numeric, per orientation) |
| Window Area | Inferred as % of BRA (e.g., 20%) | User Input (Numeric, per orientation) |
| Normalised Thermal Bridge | Inferred from Construction Year | User Override (Numeric) |
| **Systems** |  |  |
| Air Leakage Rate (n50​) | Inferred from Construction Year | User Override (Numeric) |
| Ventilation Type | Assumed Balanced w/ Heat Recovery | User Selection (Dropdown) |
| Heat Recovery Efficiency | Standard Default (e.g., 80%) | User Override (Numeric) |
| Specific Fan Power (SFP) | Standard Default (e.g., 1.5) | User Override (Numeric) |

#### **Table 2: Key Standardized Values from NS 3031:2014, Appendix A (Illustrative Examples)**

| Building Category | Lighting (kWh/m²/yr) | Equipment (kWh/m²/yr) | DHW (kWh/m²/yr) | Internal Heat Gain \- People (W/m²) | Internal Heat Gain \- Equipment (W/m²) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Småhus (Small House) | 15.0 | 25.0 | 25.0 | 2.0 | 3.4 |
| Boligblokk (Apt. Block) | 10.0 | 20.0 | 25.0 | 2.0 | 2.9 |
| Kontorbygning (Office) | 25.0 | 20.0 | 5.0 | 4.0 | 5.7 |
| Barnehage (Kindergarten) | 20.0 | 10.0 | 20.0 | 4.0 | 2.9 |

*Note: These values are representative examples based on the standard's tables and are used for compliance calculations.*

## **Section 3: The Calculation Engine: A Step-by-Step Implementation Guide**

This section outlines a sequential algorithm for the software's backend, translating the principles and inputs described previously into a concrete computational process. This guide is based on the monthly stationary method that forms the core of NS 3031:2014.

### **3.1. Step 1: Calculate the Building's Total Heat Loss Coefficient (Htotal​)**

The first step is to aggregate all sources of heat loss into a single building-specific coefficient, Htotal​, which represents the total heat loss in Watts per degree Kelvin (W/K) of temperature difference between the inside and outside.

1. Calculate Transmission Heat Loss Coefficient (HT​): Using the component areas (Ai​), U-values (Ui​), thermal bridge lengths (lk​), and Ψ-values (Ψk​) from the user inputs, compute HT​ as previously defined:

   HT​=∑(Ui​⋅Ai​)+∑(Ψk​⋅lk​)  
   11  
2. Calculate Ventilation Heat Loss Coefficient (HV​): Using the average ventilation air rate (V˙ in m³/s) and the heat recovery efficiency (ηv​), compute HV​:

   HV​=V˙⋅1200⋅(1−ηv​)

   (Note: The constant 1200 J/m³K or 0.33 Wh/m³K represents the volumetric heat capacity of air, ρcp​).11  
3. Calculate Infiltration Heat Loss Coefficient (HI​): Convert the n50​ value into an average infiltration air rate, V˙inf​. This conversion typically involves a standard factor (e.g., dividing by 20\) to estimate the average rate under natural conditions. Then, calculate HI​ similarly to HV​ (with ηv​=0):

   HI​=V˙inf​⋅1200  
4. Sum the Coefficients: The total heat loss coefficient for the building is the sum of these components:

   Htotal​=HT​+HV​+HI​

### **3.2. Step 2: Calculate Monthly and Annual Heat Gains (Qgain​)**

Next, the engine must calculate the "free" heat gains for each month of the year, using the standardized data.

1. **Calculate Monthly Internal Heat Gains (Qint,month​):** For each month, retrieve the standardized internal heat gain power from persons, lighting, and equipment (in W/m²) from NS 3031 Appendix A, Table A.2.19 Multiply this by the building's heated floor area (  
   ABRA​) and the total number of standard operating hours for that month.  
2. **Calculate Monthly Solar Heat Gains (Qsol,month​):** For each month and for each orientation (North, South, East, West), retrieve the total incident solar radiation (Isol​) from the standardized climate data in Appendix M. Using the window specifications (area, SHGC, shading factors) for each orientation, calculate the total solar gain for the month.43  
3. Sum the Gains: The total heat gain for each month is the sum of internal and solar gains:

   Qgain,month​=Qint,month​+Qsol,month​

### **3.3. Step 3: The Monthly Energy Balance and Utilization Factor (ηgain​)**

This is the core of the calculation, where losses and gains are balanced for each month to determine the net heating need.

1. Calculate Monthly Gross Heat Loss (Qloss,month​): For each month, retrieve the average outdoor temperature (Texternal,month​) from the climate data. Using the standardized indoor setpoint temperature (Tinternal​, e.g., 21°C), calculate the temperature difference (ΔT). The total heat loss for the month is:

   Qloss,month​=Htotal​⋅(Tinternal​−Texternal,month​)⋅hours\_in\_month  
2. Calculate the Gain/Loss Ratio (γmonth​): Determine the ratio of total gains to total losses for the month. This dimensionless ratio indicates whether the building is dominated by losses (γ\<1) or gains (γ\>1).

   γmonth​=Qloss,month​Qgain,month​​  
3. **Determine the Utilization Factor (ηgain​):** A crucial step is to determine what fraction of the total heat gain (Qgain,month​) is actually useful in reducing the heating demand. For example, if solar gains occur when the indoor temperature is already at or above the setpoint, they are not "utilized" for heating. NS 3031, following the principles of the European standard EN ISO 13790, uses a mathematical utilization factor that depends on the gain/loss ratio (γ) and the building's thermal time constant (τ), which is a measure of its thermal mass.11 A simplified formula for the utilization factor is:  
   ηgain​=1−γa+11−γa​for γ=1

   Where a is a numerical parameter that is a function of the thermal time constant (τ). For buildings with higher thermal mass (longer time constant), the utilization factor is higher, as the structure can better store and release heat when needed.  
4. Calculate Monthly Net Heating Need: The net energy need for heating for the month is the gross heat loss minus the utilized portion of the heat gains.

   Qheating,month​=Qloss,month​−(Qgain,month​⋅ηgain​)

   If this value is negative, the heating need for that month is zero.

### **3.4. Step 4: Allocating Energy Needs to Final Posts (NS 3031 Table 5\)**

The final step is to aggregate the monthly results and add the non-thermal energy needs to produce a final, standardized report.

1. **Sum Annual Heating Need:** Sum the calculated Qheating,month​ values for all twelve months to get the total annual net energy need for space heating. This is typically allocated to posts 1a (Room Heating) and 1b (Ventilation Heating).  
2. **Add Non-Thermal Energy Needs:** Retrieve the standardized annual energy needs for Domestic Hot Water (DHW), Lighting, and Technical Equipment directly from Appendix A, Table A.1.19 These are added to the budget without being part of the monthly thermal balance. Energy for fans and pumps is calculated based on their power (SFP) and operating hours.  
3. Calculate Cooling Need: The net energy need for cooling is calculated for months where gains exceed losses. A simplified approach is:  
   $$ Q\_{cooling,month} \= (Q\_{gain,month} \\cdot \\eta\_{gain}) \- Q\_{loss,month} \\quad \\text{for months where } Q\_{heating,month} \< 0 $$  
   The annual cooling need is the sum of these monthly values.  
4. **Present Final Results:** The final output must be structured according to the official energy posts defined in NS 3031, Table 5\. This ensures the output format is compliant with the requirements for EPCs and regulatory documentation.7

#### **Table 3: Energy Posts for Final Reporting (Based on NS 3031:2014, Table 5\)**

| Post No. | Description | Calculated Value (kWh/yr) | Specific Value (kWh/m²/yr) |
| :---- | :---- | :---- | :---- |
| 1a | Romoppvarming (Space Heating) |  |  |
| 1b | Ventilasjonsvarme (Ventilation Heating) |  |  |
| 2 | Varmtvann (Domestic Hot Water) |  |  |
| 3 | Vifter og pumper (Fans and Pumps) |  |  |
| 4 | Belysning (Lighting) |  |  |
| 5 | Teknisk utstyr (Technical Equipment) |  |  |
| 6 | Kjøling (Cooling) |  |  |
| **Total** | **Totalt Netto Energibehov** |  |  |

## **Section 4: Designing an Action-Driving Dashboard: From Data to Decisions**

A successful energy analysis tool must do more than just calculate and present a final number. Its primary value lies in its ability to translate complex data into clear, understandable, and actionable insights for the user. The dashboard is the critical interface for this translation. It should be designed to not only inform users of their building's current performance but also to guide and motivate them toward making effective energy-saving improvements. This requires a tiered approach to Key Performance Indicators (KPIs), moving from high-level summaries to detailed diagnostics and, most importantly, prescriptive recommendations.

### **4.1. Foundational KPIs: Visualizing Overall Energy Performance**

These are the headline metrics that provide an immediate, high-level understanding of the building's energy status. They should be the most prominent elements on the dashboard.

* **Energy Use Intensity (EUI):** This is the main result of the calculation: Totalt Netto Energibehov in kWh/m² per year. It should be displayed as a large, clear number, possibly within a color-coded gauge (e.g., green for good, red for poor) to provide instant context.1  
* **Energy Grade (Energikarakter):** For most non-technical users, the A-G energy label is the most familiar and relatable metric. This grade is based on *calculated delivered energy*, which requires an additional calculation step to account for the efficiency of the building's heating system. The dashboard should clearly display this letter grade, as it is a key factor in property sales and rentals.1  
* **TEK17 Compliance Check:** A simple, unambiguous visual icon, such as a green checkmark or a red 'X', should indicate whether the building's calculated EUI meets the legal energy frame (energiramme) for its specific category and size. This provides an immediate answer to the crucial question of regulatory compliance.6  
* **Estimated Annual Energy Cost:** Abstract energy units like kWh are less impactful for many users than concrete financial figures. By applying average regional energy prices to the calculated *delivered energy*, the dashboard can present an estimated annual cost in Norwegian Kroner (NOK). This KPI directly links energy performance to household or operational expenses, providing a powerful motivator for improvement.47  
* **Carbon Footprint:** To appeal to environmentally conscious users and align with corporate sustainability goals, the dashboard should translate the building's delivered energy consumption into an estimated annual carbon footprint, expressed in kilograms of CO2-equivalent (kg CO2-eq). This requires applying specific emission factors for each energy carrier (e.g., electricity, district heating).36

### **4.2. Diagnostic KPIs: Pinpointing Sources of Inefficiency**

Once the user understands their overall performance, the next logical question is "Why?". Diagnostic KPIs are designed to answer this by breaking down the total energy performance into its constituent parts, helping the user identify the primary sources of energy loss and inefficiency.

* **Energy Balance Sankey Diagram:** This is a highly effective visual tool. On the left, it shows the sources of "free" heat gain (Solar, Internal). On the right, it shows the pathways of heat loss (Walls, Roof, Windows, Ventilation, Infiltration). The flows are sized proportionally to their energy contribution, visually demonstrating how gains offset a portion of the losses to result in the final net heating need. This provides an intuitive, at-a-glance overview of the building's entire thermal dynamic.  
* **Heat Loss Breakdown (Pie or Bar Chart):** A simple chart that shows the percentage of total heat loss attributable to each major component. For example, it might show: "Windows: 35%, Walls: 25%, Ventilation: 20%, Roof: 15%, Infiltration: 5%." This immediately directs the user's attention to the weakest points in the building's thermal envelope, answering the critical question, "Where should I focus my renovation efforts?"  
* **Monthly Performance View:** A bar chart displaying the energy balance for each month of the year. It should show three bars per month: heating need, cooling need, and useful solar gains. This visualization is crucial for illustrating seasonal dynamics, showing how solar gains reduce heating needs in the spring and autumn but can contribute to significant cooling needs in the summer, thereby highlighting potential overheating issues.46

### **4.3. Prescriptive KPIs & Features: Simulating and Recommending Actionable Upgrades**

This is the most critical part of an action-driving dashboard. It moves beyond reporting past or current performance to actively helping the user plan for the future.

* **"Improve Your Score" Simulation Tool:** This interactive feature is the centerpiece of the prescriptive experience. It should present the user with a list of common energy efficiency upgrades, such as:  
  * "Upgrade windows to TEK17 standard (U-value 0.8 W/m²K)"  
  * "Add 15 cm of insulation to the loft"  
  * "Improve airtightness to TEK17 standard (n50​ \= 0.6)"  
  * "Install an air-to-air heat pump"  
    When the user selects one or more of these actions, the tool should instantly re-run the energy calculation with the modified parameters and update all the foundational KPIs on the dashboard. The user can immediately see the projected impact: the EUI drops, the energy grade improves from a 'D' to a 'C', and the estimated annual cost savings are displayed in NOK. This transforms the dashboard from a static report into a dynamic planning tool.  
* **Benchmarking:** Context is key to motivation. The user's results should be compared against several relevant benchmarks to show them where they stand and what is achievable:  
  * **Regulatory Benchmarks:** Compare the building's component values (e.g., U-values, airtightness) against both the absolute minimum requirements and the standard prescriptive requirements of TEK17.6  
  * **High-Performance Benchmarks:** For users with higher ambitions, compare their building to the Norwegian Passive House Standard (NS 3700), illustrating the path to top-tier energy performance.  
  * **Peer Benchmarking:** Compare the building's EUI to the average for similar buildings (same type and construction year) in the same region. Leveraging social proof by showing a user that their home is less efficient than their neighbors' can be a powerful catalyst for action.

The design of these prescriptive features should be guided by a clear understanding of user psychology. A static report can be informative but often leads to inaction. By creating an interactive simulation tool, the process of planning a renovation is gamified. The user is empowered to experiment with different scenarios, receiving immediate feedback on the impact of their choices. Framing the results of these simulations primarily in financial terms—"This 50,000 NOK investment in new windows will save you 5,000 NOK per year, with a payback period of 10 years"—is far more compelling to the average homeowner than abstract metrics like kWh/m². This approach transforms the product's market position from a simple calculator to a personalized and indispensable renovation advisor, opening up significant opportunities for future monetization, such as connecting users with qualified contractors or green financing options.

#### **Table 4: Proposed KPIs for the User Dashboard**

| KPI Category | KPI Name | Calculation / Display | Unit | Purpose / Action Driven |
| :---- | :---- | :---- | :---- | :---- |
| **Foundational** | Energy Use Intensity (EUI) | Total Net Energy Need / BRA | kWh/m²/yr | Provides the primary, standardized measure of building performance. |
|  | Energy Grade | Calculated from delivered energy based on official EPC scale. | A-G | "Quickly understand my home's overall performance in a familiar format." |
|  | TEK17 Compliance | EUI \<= TEK17 Energy Frame | Yes / No | "Is my building legally compliant?" |
|  | Estimated Annual Cost | Delivered Energy \* Energy Price | NOK/yr | "How much is my building's inefficiency costing me in real money?" |
|  | Carbon Footprint | Delivered Energy \* Emission Factor | kg CO₂-eq/yr | "What is my building's impact on the environment?" |
| **Diagnostic** | Heat Loss Breakdown | (H\_component / H\_total) \* 100 as a pie chart. | % | "Identify the biggest source of heat loss to prioritize upgrades." |
|  | Energy Balance | Sankey diagram showing flow of gains vs. losses. | kWh/yr | "Visually understand why my energy need is what it is." |
|  | Monthly Performance | Bar chart of monthly heating/cooling/solar gains. | kWh/month | "See how my building performs across seasons and identify overheating risk." |
| **Prescriptive** | Simulated EUI Improvement | EUI\_before \- EUI\_after from simulation tool. | kWh/m²/yr | "Quantify the energy impact of a specific renovation." |
|  | Simulated Cost Savings | Cost\_before \- Cost\_after from simulation tool. | NOK/yr | "Justify the financial investment in an upgrade." |
|  | Payback Period | Upgrade Cost / Annual Savings | Years | "Understand how long it will take for an investment to pay for itself." |
|  | Benchmark Gap | (User\_U\_value \- TEK17\_U\_value) | W/m²K | "See how my components compare to the current building code standard." |

## **Section 5: Strategic Recommendations: Building a Future-Proof Product**

To ensure long-term market relevance and success, the product must be more than a technically accurate implementation of a single standard. It requires a forward-looking architecture, a strategy for data enrichment, and clear market positioning. This section provides high-level recommendations to guide the product's strategic development.

### **5.1. Navigating the NS 3031 Standard Landscape: A Strategy for Compliance and Future-Readiness**

The most significant technical and strategic challenge is the regulatory status of NS 3031:2014. While it is the current legal reference in TEK17, the standard is officially obsolete and is set to be replaced by a new version, NS 3031:2025.3 This forthcoming standard, along with its interim specifications (e.g., SN-NSPEK 3031), introduces a fundamental shift in methodology. It moves away from the relatively simple monthly stationary calculation of the 2014 version to a more complex and accurate dynamic (hourly) simulation method.38

A product built rigidly on the 2014 methodology risks immediate obsolescence once the building regulations are updated. Therefore, the software architecture must be designed for this inevitable transition.

**Strategic Recommendation: Implement a Modular, "Pluggable" Standards Engine.**

1. **Build a Core Dynamic Engine:** The software's calculation core should be built from the ground up to perform hourly dynamic energy simulations. This involves solving the energy balance equations for each hour of the year, which provides a much more accurate representation of thermal storage, solar gains, and system interactions. This dynamic core is the future-proof foundation.  
2. **Create an "NS 3031:2014 Adapter":** For the initial product launch, develop a specific module or "adapter" that sits on top of the dynamic engine. This adapter's function is to feed the engine with data that forces it to replicate the simpler 2014 standard. It would provide monthly-averaged climate data for every hour of that month and apply the constant, standardized internal gain profiles from Appendix A. This approach uses the powerful core engine to correctly emulate the legacy standard for compliance purposes.  
3. **Utilize a Configurable Data Store:** All standardized values from the appendices of any standard (U-values, internal loads, climate data, etc.) should not be hard-coded into the application. They must be stored in a separate, easily updatable database or set of configuration files.

The strategic payoff of this architecture is immense. When TEK17 is eventually updated to reference NS 3031:2025, the task of updating the product will not require a fundamental rewrite. It will instead involve developing a new "NS 3031:2025 adapter" and loading the new standard's hourly data profiles and updated parameters into the configurable data store. This approach dramatically reduces future development costs and provides a significant competitive advantage by enabling rapid adaptation to regulatory changes.

### **5.2. Data Sourcing and Integration Opportunities for Enhanced User Value**

To maximize user convenience and the accuracy of "Real-World Mode" calculations, the product should integrate with external data sources.

* **Automated Property Data Population:** For the Basic form, integrating with public APIs can significantly streamline the user experience. The Norwegian cadastre (Matrikkelen) can be used to automatically retrieve a building's heated floor area (BRA) and construction year based on its address, reducing manual entry and potential errors.  
* **Real-World Energy Data Calibration:** A premium feature could involve partnership with the Norwegian national data hub for smart meters (Elhub). With user consent, the tool could import a building's actual historical electricity consumption data. This real-world data can be used to calibrate the energy model, adjusting parameters like the assumed infiltration rate or internal load schedules until the model's output closely matches the measured reality. This transforms the tool from a standardized calculator into a highly accurate "digital twin" of the user's specific property, enabling far more precise renovation planning and savings forecasts.52  
* **Real Estate Market Data Integration:** To powerfully reinforce the financial benefits of energy upgrades, the tool could integrate with major real estate platforms like FINN.no or property valuation services like Eiendomsverdi. This would allow the dashboard to display data-driven insights, such as "Homes in your area with an Energy Grade of 'B' sell for an average of 5% more than homes with a 'D' grade." This directly connects energy efficiency improvements to a tangible increase in property value, a compelling argument for any homeowner.

### **5.3. Concluding Remarks on Product Strategy and Market Positioning**

To capture the market effectively, the product's identity must transcend that of a simple "TEK-sjekk replacement" or compliance tool. It should be positioned as a comprehensive **Home Energy Management and Renovation Planning Platform**.

The marketing and feature set should be tailored to distinct user segments:

* **Homeowners:** The value proposition is centered on reducing utility bills, improving indoor comfort, and increasing property value. The interactive simulation tool and financial KPIs are the key features for this group.  
* **Real Estate Agents:** The tool can be used as a sales and marketing asset, allowing them to generate professional energy reports for listings, showcase a property's potential, and help buyers understand future energy costs.  
* **Banks and Lenders:** The platform can serve as a verification tool for green financial products. Many green mortgages or renovation loans require a building to achieve a certain EPC label (e.g., 'A' or 'B') or to demonstrate a minimum energy reduction (e.g., 30%).34 This tool can provide the standardized, verifiable calculations needed to document eligibility for such products.

By building a technically robust and architecturally flexible platform based on the principles of NS 3031, and by focusing relentlessly on a user experience that translates complex data into clear, actionable, and financially relevant insights, this product can establish itself as an indispensable tool for homeowners, industry professionals, and financial institutions across the Norwegian market.

#### **Works cited**

1. Green homes and the EU Taxonomy \- Eiendomsverdi AS, accessed September 24, 2025, [https://home.eiendomsverdi.no/assets/images/Artikler/Gr%C3%B8nn-bolig/greenHomes-2024.pdf](https://home.eiendomsverdi.no/assets/images/Artikler/Gr%C3%B8nn-bolig/greenHomes-2024.pdf)  
2. NS 3031:2014 \- Accuris Standards Store, accessed September 24, 2025, [https://store.accuristech.com/standards/ns-3031-2014?product\_id=2543752](https://store.accuristech.com/standards/ns-3031-2014?product_id=2543752)  
3. NS 3031 – Beregning av bygningers energiytelse er trukket tilbake, men vises fortsatt til i byggteknisk forskrift | Tu.no, accessed September 24, 2025, [https://www.tu.no/artikler/ns-3031-beregning-av-bygningers-energiytelse-er-trukket-tilbake-men-vises-fortsatt-til-i-byggteknisk-forskrift/513576](https://www.tu.no/artikler/ns-3031-beregning-av-bygningers-energiytelse-er-trukket-tilbake-men-vises-fortsatt-til-i-byggteknisk-forskrift/513576)  
4. NS 3031:2014 Beregning av bygningers energiytelse er trukket tilbake, men vises fortsatt til i byggteknisk forskrift \- Standard Norge, accessed September 24, 2025, [https://standard.no/fagomrader/energi-og-klima-i-bygg/bygningsenergi/ns-3031-beregning-av-bygningers-energiytelse-er-trukket-tilbake-men-vises-fortsatt-til-i-byggteknisk-forskrift/](https://standard.no/fagomrader/energi-og-klima-i-bygg/bygningsenergi/ns-3031-beregning-av-bygningers-energiytelse-er-trukket-tilbake-men-vises-fortsatt-til-i-byggteknisk-forskrift/)  
5. UTREDNING AV MULIG MODELL FOR NNEB I TEK UTREDNINGSRAPPORT \- Direktoratet for byggkvalitet, accessed September 24, 2025, [https://www.dibk.no/globalassets/02.-om-oss/rapporter-og-publikasjoner/energi/utredning-av-mulig-modell-for-nneb-i-tek-versjon-02-og-notat-civitas.pdf](https://www.dibk.no/globalassets/02.-om-oss/rapporter-og-publikasjoner/energi/utredning-av-mulig-modell-for-nneb-i-tek-versjon-02-og-notat-civitas.pdf)  
6. § 14-2. Krav til energieffektivitet \- Direktoratet for byggkvalitet, accessed September 24, 2025, [https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/14/14-2](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/14/14-2)  
7. § 14-2. Krav til energieffektivitet \- Direktoratet for byggkvalitet, accessed September 24, 2025, [https://www.dibk.no/globalassets/endringshistorikk/byggteknisk-forskrift/01.07.16/-14-2.-krav-til-energieffektivitet---direktoratet-for-byggkvalitet\_01.01.16-30.06.16.pdf](https://www.dibk.no/globalassets/endringshistorikk/byggteknisk-forskrift/01.07.16/-14-2.-krav-til-energieffektivitet---direktoratet-for-byggkvalitet_01.01.16-30.06.16.pdf)  
8. Nøkkelen til energiforståelse i byggenæringen \- ITBaktuelt, accessed September 24, 2025, [https://www.itbaktuelt.no/noekkelen-til-energiforstaaelse-i-byggenaeringen.6719327-596175.html](https://www.itbaktuelt.no/noekkelen-til-energiforstaaelse-i-byggenaeringen.6719327-596175.html)  
9. Beregningseksempler med ny NS 3031:2025, accessed September 24, 2025, [https://standard.no/globalassets/kurs-arrangement-og-radgiving/standard-morgen-og-andre-arr/lansering-av-ns-3031-beregning-av-energi--og-effektbehov/beregningseksempler-med-ny-ns-3031\_2025---trond-ivar-bohn-1.pdf](https://standard.no/globalassets/kurs-arrangement-og-radgiving/standard-morgen-og-andre-arr/lansering-av-ns-3031-beregning-av-energi--og-effektbehov/beregningseksempler-med-ny-ns-3031_2025---trond-ivar-bohn-1.pdf)  
10. En veileder for byggherrer med energiambisjoner \- Grønn byggallianse, accessed September 24, 2025, [https://byggalliansen.no/wp-content/uploads/2018/11/Ca-til-A-en-veileder-for-byggherrer-med-energiambisjoner.pdf](https://byggalliansen.no/wp-content/uploads/2018/11/Ca-til-A-en-veileder-for-byggherrer-med-energiambisjoner.pdf)  
11. Energy-optimal ventilation strategy outside of the operating time for passive house office buildings in cold climates | SINTEF, accessed September 24, 2025, [https://www.sintef.no/contentassets/9e42d986a70c42379247961e8b029392/energy-optimal-ventilation-strategy-outside-of-the-operating-time-for-passive-house-office-buildings-in-cold-climates.pdf](https://www.sintef.no/contentassets/9e42d986a70c42379247961e8b029392/energy-optimal-ventilation-strategy-outside-of-the-operating-time-for-passive-house-office-buildings-in-cold-climates.pdf)  
12. How to Perform a Heat-Loss Calculation — Part 1, accessed September 24, 2025, [https://lorisweb.com/CMGT235/DIS02/Heat%20Loss%20Calculations%20Part%201.pdf](https://lorisweb.com/CMGT235/DIS02/Heat%20Loss%20Calculations%20Part%201.pdf)  
13. How to size a heat pump, using heat loss calculations. \- YouTube, accessed September 24, 2025, [https://m.youtube.com/watch?v=2s3AeOwd5NQ](https://m.youtube.com/watch?v=2s3AeOwd5NQ)  
14. Kuldebroer – Beregning, kulde- broverdier og innvirkning på energibruk \- SINTEF, accessed September 24, 2025, [https://www.sintef.no/globalassets/upload/byggforsk/publikasjoner/sb\_prosjektrapport\_25.pdf](https://www.sintef.no/globalassets/upload/byggforsk/publikasjoner/sb_prosjektrapport_25.pdf)  
15. Veiledning om tekniske krav til byggverk \- Regjeringen.no, accessed September 24, 2025, [https://www.regjeringen.no/contentassets/20503ddfe0664fac9e2185c1a6c80716/veiledning-til-byggteknisk-forskrift-tek17\_01\_07\_2017\_oppdatert\_15\_09\_2017.pdf](https://www.regjeringen.no/contentassets/20503ddfe0664fac9e2185c1a6c80716/veiledning-til-byggteknisk-forskrift-tek17_01_07_2017_oppdatert_15_09_2017.pdf)  
16. Regulations on technical requirements for construction works, accessed September 24, 2025, [https://www.dibk.no/globalassets/byggeregler/regulation-on-technical-requirements-for-construction-works--technical-regulations.pdf](https://www.dibk.no/globalassets/byggeregler/regulation-on-technical-requirements-for-construction-works--technical-regulations.pdf)  
17. beregningsgrunnlag-for-nye-energirammer-i-tek-2015.pdf, accessed September 24, 2025, [https://www.dibk.no/globalassets/energi/beregningsgrunnlag-for-nye-energirammer-i-tek-2015.pdf](https://www.dibk.no/globalassets/energi/beregningsgrunnlag-for-nye-energirammer-i-tek-2015.pdf)  
18. Techno-economic evaluation of heat- driven cooling solutions for utilization of district heat in Aalesund, Norway \- DiVA portal, accessed September 24, 2025, [https://www.diva-portal.org/smash/get/diva2:1294511/FULLTEXT01.pdf](https://www.diva-portal.org/smash/get/diva2:1294511/FULLTEXT01.pdf)  
19. Praktisk veileder for energimerking \- NVE, accessed September 24, 2025, [https://publikasjoner.nve.no/veileder/2013/veileder2013\_05.pdf](https://publikasjoner.nve.no/veileder/2013/veileder2013_05.pdf)  
20. Guidelines on energy system analysis and cost optimality in early design of ZEB \- FME ZEN, accessed September 24, 2025, [https://fmezen.no/wp-content/uploads/2018/05/ZEB-pr-report-no-41.pdf](https://fmezen.no/wp-content/uploads/2018/05/ZEB-pr-report-no-41.pdf)  
21. MASTEROPPGAVE \- OsloMet ODA, accessed September 24, 2025, [https://oda.oslomet.no/oda-xmlui/bitstream/handle/11250/3208830/no.oslomet%3Ainspera%3A360408093%3A98014645.pdf?sequence=1\&isAllowed=y](https://oda.oslomet.no/oda-xmlui/bitstream/handle/11250/3208830/no.oslomet%3Ainspera%3A360408093%3A98014645.pdf?sequence=1&isAllowed=y)  
22. Estimation Methodology for the Electricity Consumption with the Daylight- and Occupancy-Controlled Artificial Lighting \- Aalborg Universitets forskningsportal, accessed September 24, 2025, [https://vbn.aau.dk/files/272987199/Estimation\_methodology\_for\_the\_electricity\_consumption\_with\_daylight\_and\_occupancy\_controlled\_artificial\_lighting.pdf](https://vbn.aau.dk/files/272987199/Estimation_methodology_for_the_electricity_consumption_with_daylight_and_occupancy_controlled_artificial_lighting.pdf)  
23. cae464\_517 lecture06\_ Heating and cooling loads \- The Built Environment Research Group, accessed September 24, 2025, [http://built-envi.com/wp-content/uploads/cae464\_517-lecture06\_-Heating-and-cooling-loads\_sp21.pdf](http://built-envi.com/wp-content/uploads/cae464_517-lecture06_-Heating-and-cooling-loads_sp21.pdf)  
24. A simple-to-use calculator for determining the total solar heat gain of a glazing system \- Architectural Science Association, accessed September 24, 2025, [https://anzasca.net/wp-content/uploads/2014/08/p511.pdf](https://anzasca.net/wp-content/uploads/2014/08/p511.pdf)  
25. Solar Heat Gain Coefficient: A Key to Energy Savings \- EverClear Window Tinting, accessed September 24, 2025, [https://www.evercleartinting.com.au/solar-heat-gain-coefficient/](https://www.evercleartinting.com.au/solar-heat-gain-coefficient/)  
26. Mulige endringer i energikrav \- Direktoratet for byggkvalitet, accessed September 24, 2025, [https://www.dibk.no/verktoy-og-veivisere/rapporter-og-publikasjoner/mulige-endringer-i-energikrav/Mulige%20endringer%20i%20energikrav%E2%80%93Multiconsult.pdf](https://www.dibk.no/verktoy-og-veivisere/rapporter-og-publikasjoner/mulige-endringer-i-energikrav/Mulige%20endringer%20i%20energikrav%E2%80%93Multiconsult.pdf)  
27. Energikonsept \- Mercell, accessed September 24, 2025, [https://www.mercell.com/m/file/GetFile.ashx?id=225179540\&version=0](https://www.mercell.com/m/file/GetFile.ashx?id=225179540&version=0)  
28. Solar Heating in Norwegian Passive Houses \- DUO, accessed September 24, 2025, [https://www.duo.uio.no/bitstream/handle/10852/37180/1/masteroppgave.pdf](https://www.duo.uio.no/bitstream/handle/10852/37180/1/masteroppgave.pdf)  
29. Design and Energy Analysis of Natural and Hybrid ... \- NTNU Open, accessed September 24, 2025, [https://ntnuopen.ntnu.no/ntnu-xmlui/bitstream/handle/11250/2410778/14989\_FULLTEXT.pdf?sequence=1](https://ntnuopen.ntnu.no/ntnu-xmlui/bitstream/handle/11250/2410778/14989_FULLTEXT.pdf?sequence=1)  
30. NERO – Cost reduction of new Nearly-Zero Energy Wooden buildings in Northern Climate Conditions \- European Commission, accessed September 24, 2025, [https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=080166e5c7dc870e\&appId=PPGMS](https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=080166e5c7dc870e&appId=PPGMS)  
31. NOTAT 01 \- Mercell, accessed September 24, 2025, [https://www.mercell.com/m/file/GetFile.ashx?id=95049847\&version=0](https://www.mercell.com/m/file/GetFile.ashx?id=95049847&version=0)  
32. Solskjerming av vindu \- UiT Munin, accessed September 24, 2025, [https://munin.uit.no/bitstream/handle/10037/13465/thesis.pdf?sequence=2\&isAllowed=y](https://munin.uit.no/bitstream/handle/10037/13465/thesis.pdf?sequence=2&isAllowed=y)  
33. Residential building portfolio- carbon and energy footprint \- Eika Boligkreditt, accessed September 24, 2025, [https://eikbol.no/-/media/banker/eika-boligkreditt/pdf/green\_bonds/2020-Eika-Boligkreditt---Residental-building-portfolio--carbon-and-energy-footprint.pdf](https://eikbol.no/-/media/banker/eika-boligkreditt/pdf/green_bonds/2020-Eika-Boligkreditt---Residental-building-portfolio--carbon-and-energy-footprint.pdf)  
34. Green Norwegian Buildings \- Eiendomskreditt, accessed September 24, 2025, [https://eiendomskreditt.no/wp-content/uploads/Report\_KfSEiendomskreditt\_01\_v02.pdf](https://eiendomskreditt.no/wp-content/uploads/Report_KfSEiendomskreditt_01_v02.pdf)  
35. BN Bank Green Buildings Portfolio, accessed September 24, 2025, [https://www.bnbank.no/globalassets/02\_om-oss/gronn-bank/rammeverk/rapport-multiconsult.pdf](https://www.bnbank.no/globalassets/02_om-oss/gronn-bank/rammeverk/rapport-multiconsult.pdf)  
36. State-of-the-Art Analysis of Nearly Zero Energy Buildings, accessed September 24, 2025, [https://sintef.brage.unit.no/sintef-xmlui/bitstream/handle/11250/2505468/28\_SINTEF%2BNotat%2B%2B28.pdf](https://sintef.brage.unit.no/sintef-xmlui/bitstream/handle/11250/2505468/28_SINTEF%2BNotat%2B%2B28.pdf)  
37. Energikonsept \- Leka helsehus, accessed September 24, 2025, [https://www.leka.kommune.no/\_f/p7/ibc9a827e-0bc2-4b21-bebc-f9cb0e2caf7b/energikonsept-leka-helsehus-rev02.pdf](https://www.leka.kommune.no/_f/p7/ibc9a827e-0bc2-4b21-bebc-f9cb0e2caf7b/energikonsept-leka-helsehus-rev02.pdf)  
38. Ny NS 3031 – et løft for tekniske installasjoner \- VKE, accessed September 24, 2025, [https://www.vke.no/artikler/2025/ny-3031/](https://www.vke.no/artikler/2025/ny-3031/)  
39. ENERGIKONSEPT \- Mercell, accessed September 24, 2025, [https://www.mercell.com/m/file/GetFile.ashx?id=203952682\&version=0](https://www.mercell.com/m/file/GetFile.ashx?id=203952682&version=0)  
40. Energiberegning og evaluering mot energikrav \- Mercell, accessed September 24, 2025, [https://www.mercell.com/m/file/GetFile.ashx?id=96045652\&version=0](https://www.mercell.com/m/file/GetFile.ashx?id=96045652&version=0)  
41. FJELL SJUKEHEIM ENERGIKONSEPT \- Mercell, accessed September 24, 2025, [https://www.mercell.com/m/file/GetFile.ashx?id=113477922\&version=0](https://www.mercell.com/m/file/GetFile.ashx?id=113477922&version=0)  
42. Krav om reelt energibudsjett \- Tekna, accessed September 24, 2025, [https://www.tekna.no/fag-og-nettverk/bygg-og-anlegg/krav-om-reelt-energibudsjett/](https://www.tekna.no/fag-og-nettverk/bygg-og-anlegg/krav-om-reelt-energibudsjett/)  
43. A simple-to-use calculator for determining the total solar heat gain of a glazing system, accessed September 24, 2025, [https://dro.deakin.edu.au/articles/conference\_contribution/A\_simple-to-use\_calculator\_for\_determining\_the\_total\_solar\_heat\_gain\_of\_a\_glazing\_system/20969305](https://dro.deakin.edu.au/articles/conference_contribution/A_simple-to-use_calculator_for_determining_the_total_solar_heat_gain_of_a_glazing_system/20969305)  
44. Evaluation of the Reference Numerical Parameters of the Monthly Method in ISO 13790 Considering S/V Ratio \- ResearchGate, accessed September 24, 2025, [https://www.researchgate.net/publication/271723863\_Evaluation\_of\_the\_Reference\_Numerical\_Parameters\_of\_the\_Monthly\_Method\_in\_ISO\_13790\_Considering\_SV\_Ratio](https://www.researchgate.net/publication/271723863_Evaluation_of_the_Reference_Numerical_Parameters_of_the_Monthly_Method_in_ISO_13790_Considering_SV_Ratio)  
45. MASTEROPPGAVE \- OsloMet ODA, accessed September 24, 2025, [https://oda.oslomet.no/oda-xmlui/bitstream/handle/11250/3101396/Barenji\_MAEN\_2023.pdf?sequence=1\&isAllowed=y](https://oda.oslomet.no/oda-xmlui/bitstream/handle/11250/3101396/Barenji_MAEN_2023.pdf?sequence=1&isAllowed=y)  
46. ENERGY PERFORMANCE MONITORING \- Better Buildings Partnership, accessed September 24, 2025, [https://www.betterbuildingspartnership.co.uk/sites/default/files/media/attachment/BBP\_How%20to\_GN%204.12%20Energy%20Performance%20Monitoring.pdf](https://www.betterbuildingspartnership.co.uk/sites/default/files/media/attachment/BBP_How%20to_GN%204.12%20Energy%20Performance%20Monitoring.pdf)  
47. What KPIs and Analytics Are Used on Energy Management Dashboards? \- InetSoft, accessed September 24, 2025, [https://www.inetsoft.com/info/energy-management-dashboards-kpis-and-analytics](https://www.inetsoft.com/info/energy-management-dashboards-kpis-and-analytics)  
48. Appendix: Building LCA and BIM Practices in Norway, accessed September 24, 2025, [https://pub.norden.org/us2023-463/appendix-building-lca-and-bim-practices-in-norway.html](https://pub.norden.org/us2023-463/appendix-building-lca-and-bim-practices-in-norway.html)  
49. What KPIs and Analytics Are Used on Building Power Management Dashboards? \- InetSoft, accessed September 24, 2025, [https://www.inetsoft.com/info/building-power-management-dashboard-kpis-and-analytics/](https://www.inetsoft.com/info/building-power-management-dashboard-kpis-and-analytics/)  
50. § 14-3. Minimumsnivå for energieffektivitet \- Direktoratet for byggkvalitet, accessed September 24, 2025, [https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/14/14-3](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/14/14-3)  
51. standard.no. NS 3031:2014 \- Standard Norge, accessed September 24, 2025, [https://online.standard.no/en/ns-3031-2014](https://online.standard.no/en/ns-3031-2014)  
52. Building Energy Performance Evaluation of a Norwegian single-family house applying ISO-52016 \- E3S Web of Conferences, accessed September 24, 2025, [https://www.e3s-conferences.org/articles/e3sconf/pdf/2022/29/e3sconf\_bsn2022\_13006.pdf](https://www.e3s-conferences.org/articles/e3sconf/pdf/2022/29/e3sconf_bsn2022_13006.pdf)  
53. Dette er etterfølgeren til NS 3031:2014 om bygningers energiytelse. \- Simien, accessed September 24, 2025, [https://simien.no/dette-er-nytt-i-den-nye-spesifikasjon-om-bygningers-energiytelse/](https://simien.no/dette-er-nytt-i-den-nye-spesifikasjon-om-bygningers-energiytelse/)  
54. Green Buildings Portfolio – Impact Assessment \- Askim & Spydeberg Sparebank, accessed September 24, 2025, [https://www.asbank.no/-/media/askimspydebergsparebank/dokumenter/diverse/green-buildings-portfolio--impact-assessment-multiconsult.pdf?rev=c4bde7efbf434c0a967585f3425330eb\&hash=C2AE2B4DB401092D8C7E91B2B11F5836](https://www.asbank.no/-/media/askimspydebergsparebank/dokumenter/diverse/green-buildings-portfolio--impact-assessment-multiconsult.pdf?rev=c4bde7efbf434c0a967585f3425330eb&hash=C2AE2B4DB401092D8C7E91B2B11F5836)