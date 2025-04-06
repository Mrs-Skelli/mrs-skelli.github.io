---
title: "Setting Up a Red Team Lab Environment"
date: 2024-03-12
draft: false
---

# Setting Up a Red Team Lab Environment

In this guide, I'll walk through how I set up my personal red team lab environment for practicing offensive security techniques in a safe, isolated network. This setup allows me to simulate real-world attacks without risking any actual systems.

## Lab Architecture

My lab consists of:

1. 1 pfSense firewall VM (to create network isolation)
2. 3 Windows Server 2019 VMs (one configured as domain controller)
3. 5 Windows 10 workstation VMs
4. 2 Linux servers (Ubuntu and CentOS)
5. 1 Kali Linux VM for attack operations

The setup uses VMware Workstation as the hypervisor with multiple virtual networks that mimic a corporate environment:

- Management network (10.0.0.0/24)
- DMZ network (172.16.0.0/24)
- Internal network (192.168.1.0/24)

## Vulnerable Configurations

To make the lab useful for training, I've deliberately introduced various security weaknesses:

- Outdated software versions
- Weak password policies
- Misconfigured services
- Excessive privileges
- Insecure network shares

## Tools and Resources Used

- VMware Workstation Pro
- [AutomatedLab](https://github.com/AutomatedLab/AutomatedLab) for automated AD deployment
- [VulnAD](https://github.com/WazeHell/vulnerable-AD) for creating vulnerable AD configurations
- [Atomic Red Team](https://github.com/redcanaryco/atomic-red-team) for attack simulations

## Challenges I've Designed

I've set up several CTF-like challenges in the environment:

1. Privilege escalation via insecure service permissions
2. Lateral movement through the network
3. Credential harvesting
4. Domain privilege escalation
5. Data exfiltration scenarios

## Monitoring and Defense

I've also implemented basic defensive measures to practice evasion:

- Windows Event Logging
- Sysmon with custom configurations
- A basic SIEM using Wazuh
- Simple IDS rules

---

*Note: This setup is for educational purposes only. The techniques described should only be used in controlled environments with proper authorization.* 